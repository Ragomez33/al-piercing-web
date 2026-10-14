<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Trash2, X } from "lucide-svelte";
  import { DataError, dataStore } from "../../lib/data/store";
  import { subscribeToDataChanges } from "../../lib/data/realtime";
  import type {
    AvailabilityBlock,
    StudioSchedule,
    StudioScheduleDay,
    Weekday,
  } from "../../lib/types/domain";
  import {
    blockOverlapsInterval,
    fullDayRangeToISO,
    localDateFromISO,
    localTimeFromISO,
    resolveSlotInterval,
    slotStartToISO,
  } from "../../lib/utils/availability";

  type BlockMode = "range" | "full_day";

  const WEEKDAYS_DISPLAY: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const WEEKDAY_LABELS: Record<Weekday, string> = {
    sun: "Domingo",
    mon: "Lunes",
    tue: "Martes",
    wed: "Miércoles",
    thu: "Jueves",
    fri: "Viernes",
    sat: "Sábado",
  };

  // ---- Weekly schedule editor (US1/US3) ----
  let schedule = $state<StudioSchedule>([]);
  let draft = $state<StudioSchedule>([]);
  let scheduleLoading = $state(false);
  let scheduleLoaded = $state(false);
  let scheduleError = $state("");
  let savingSchedule = $state(false);
  let saveNotice = $state("");
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Block manager (US2) ----
  let blocks = $state<AvailabilityBlock[]>([]);
  let blocksLoading = $state(false);
  let blocksLoaded = $state(false);
  let blocksError = $state("");
  let blockBusy = $state<Record<string, boolean>>({});

  let blockMode = $state<BlockMode>("range");
  let rangeDate = $state("");
  let rangeStart = $state("09:00");
  let rangeEnd = $state("10:00");
  let fullStart = $state("");
  let fullEnd = $state("");
  let reason = $state("");
  let blockError = $state("");
  let creatingBlock = $state(false);
  let collisionNotice = $state("");

  let deletingBlock = $state<AvailabilityBlock | null>(null);
  let deleteBusy = $state(false);
  let deleteError = $state("");

  let durations = $state<Record<string, number>>({});
  let unsubscribeLive: (() => void) | null = null;

  // ---- Schedule editor helpers ----
  function draftFor(weekday: Weekday): StudioScheduleDay | undefined {
    return draft.find((day) => day.weekday === weekday);
  }

  function setDraftWeekday(weekday: Weekday, patch: Partial<StudioScheduleDay>) {
    draft = draft.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day));
  }

  async function refreshSchedule() {
    scheduleLoading = true;
    scheduleError = "";
    saveNotice = "";
    try {
      const loaded = await dataStore.getSchedule();
      schedule = loaded;
      draft = loaded.map((day) => ({ ...day }));
      scheduleLoaded = true;
    } catch (err) {
      scheduleError = err instanceof DataError ? err.message : "No se pudo cargar el horario";
    } finally {
      scheduleLoading = false;
    }
  }

  function showSaveNotice(message: string) {
    saveNotice = message;
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      saveNotice = "";
      noticeTimer = null;
    }, 2_600);
  }

  /**
   * Toggle one weekday open/closed. Closed days keep their draft times so a
   * later re-enable restores the previously saved hours; when re-enabling a day
   * with no times stored, fall back to the studio defaults.
   */
  function toggleDay(day: StudioScheduleDay) {
    const open = !day.isOpen;
    const hasTimes = !!day.openTime && !!day.closeTime;
    setDraftWeekday(day.weekday, {
      isOpen: open,
      openTime: open && !hasTimes ? "11:00" : day.openTime,
      closeTime: open && !hasTimes ? "20:00" : day.closeTime,
    });
  }

  /**
   * Atomic save: validates all seven days first, then persists the whole
   * schedule in a single mutation (`dataStore.updateSchedule`).
   */
  async function saveSchedule() {
    if (savingSchedule) return;
    scheduleError = "";
    saveNotice = "";

    for (const day of draft) {
      if (!day.isOpen) continue;
      if (!day.openTime || !day.closeTime) {
        scheduleError = `Completá la hora de apertura y cierre de ${WEEKDAY_LABELS[day.weekday]}`;
        return;
      }
      const open = Number(day.openTime.replace(":", ""));
      const close = Number(day.closeTime.replace(":", ""));
      if (close <= open) {
        scheduleError = `El cierre de ${WEEKDAY_LABELS[day.weekday]} debe ser posterior a la apertura`;
        return;
      }
    }

    const payload: StudioSchedule = draft.map((day) => ({
      weekday: day.weekday,
      isOpen: day.isOpen,
      openTime: day.isOpen ? day.openTime : null,
      closeTime: day.isOpen ? day.closeTime : null,
    }));

    savingSchedule = true;
    try {
      const updated = await dataStore.updateSchedule(payload);
      schedule = updated;
      draft = updated.map((entry) => ({ ...entry }));
      showSaveNotice("Horario actualizado");
    } catch (err) {
      scheduleError = err instanceof DataError ? err.message : "No se pudo guardar el horario";
    } finally {
      savingSchedule = false;
    }
  }

  // ---- Block manager helpers ----
  async function refreshBlocks() {
    blocksLoading = true;
    blocksError = "";
    try {
      blocks = await dataStore.listBlocks();
      blocksLoaded = true;
    } catch (err) {
      blocksError = err instanceof DataError ? err.message : "No se pudo cargar la lista de bloqueos";
    } finally {
      blocksLoading = false;
    }
  }

  async function loadServiceDurations() {
    try {
      const services = await dataStore.listServices({ includeInactive: true });
      durations = Object.fromEntries(services.map((service) => [service.id, service.durationMinutes]));
    } catch {
      durations = {};
    }
  }

  function buildInterval(): { startDatetime: string; endDatetime: string } | null {
    if (blockMode === "range") {
      if (!rangeDate || !rangeStart || !rangeEnd) return null;
      const start = slotStartToISO(rangeDate, rangeStart);
      const end = slotStartToISO(rangeDate, rangeEnd);
      return start && end ? { startDatetime: start, endDatetime: end } : null;
    }
    if (!fullStart || !fullEnd) return null;
    return fullDayRangeToISO(fullStart, fullEnd);
  }

  async function submitBlock() {
    const interval = buildInterval();
    if (!interval) {
      blockError = "Completá la fecha y las horas del bloqueo";
      return;
    }
    blockError = "";
    collisionNotice = "";
    creatingBlock = true;
    try {
      const created = await dataStore.createBlock({
        startDatetime: interval.startDatetime,
        endDatetime: interval.endDatetime,
        reason: reason.trim(),
        isFullDay: blockMode === "full_day",
      });
      blocks = [...blocks, created].sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));

      // FR-011: warn (never auto-cancel) when the new block overlaps appointments.
      const bookings = await dataStore.listBookings();
      const start = new Date(created.startDatetime);
      const end = new Date(created.endDatetime);
      const collides = bookings.some((booking) => {
        if (booking.status === "CANCELLED") return false;
        const interval = resolveSlotInterval(
          booking.date,
          booking.timeSlot,
          durations[booking.serviceId ?? ""] ?? 30,
        );
        return blockOverlapsInterval(created, interval.start, interval.end);
      });
      if (collides) {
        collisionNotice = "Este bloqueo coincide con una cita existente. Las citas no se modificaron.";
      }

      rangeDate = "";
      rangeStart = "09:00";
      rangeEnd = "10:00";
      fullStart = "";
      fullEnd = "";
      reason = "";
    } catch (err) {
      blockError = err instanceof DataError ? err.message : "No se pudo crear el bloqueo";
    } finally {
      creatingBlock = false;
    }
  }

  function askDeleteBlock(block: AvailabilityBlock) {
    deleteError = "";
    deletingBlock = block;
  }

  function cancelDeleteBlock() {
    deletingBlock = null;
    deleteError = "";
  }

  async function confirmDeleteBlock() {
    if (!deletingBlock) return;
    deleteBusy = true;
    deleteError = "";
    try {
      const id = deletingBlock.id;
      await dataStore.deleteBlock(id);
      blocks = blocks.filter((block) => block.id !== id);
      deletingBlock = null;
    } catch (err) {
      deleteError = err instanceof DataError ? err.message : "No se pudo eliminar el bloqueo";
    } finally {
      deleteBusy = false;
    }
  }

  // ---- Display helpers ----
  function blockStartDate(block: AvailabilityBlock): string {
    return localDateFromISO(block.startDatetime);
  }

  function blockStartTime(block: AvailabilityBlock): string {
    return localTimeFromISO(block.startDatetime);
  }

  function blockEndTime(block: AvailabilityBlock): string {
    return localTimeFromISO(block.endDatetime);
  }

  function fullDayEndLabel(block: AvailabilityBlock): string {
    // end_datetime is exclusive (next midnight); display the day BEFORE it.
    const end = new Date(new Date(block.endDatetime).getTime() - 24 * 60 * 60 * 1000);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const d = String(end.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // ---- Live refresh (US4: cross-tab/device sync) ----
  async function refreshAllQuiet() {
    try {
      const [loadedSchedule, loadedBlocks] = await Promise.all([
        dataStore.getSchedule(),
        dataStore.listBlocks(),
      ]);
      schedule = loadedSchedule;
      draft = loadedSchedule.map((day) => ({ ...day }));
      blocks = loadedBlocks;
      scheduleLoaded = true;
      blocksLoaded = true;
    } catch {
      // Keep the last known data on transient failures.
    }
  }

  onMount(() => {
    void refreshSchedule();
    void refreshBlocks();
    void loadServiceDurations();
    unsubscribeLive = subscribeToDataChanges(["blocks", "schedule"], () => {
      void refreshAllQuiet();
    });
  });

  onDestroy(() => {
    unsubscribeLive?.();
  });
</script>

<section class="schedule-panel" aria-label="Horarios y bloqueos">
  <!-- ================= Weekly schedule editor (US1/US3) ================= -->
  <h2 class="section-title">Horario semanal</h2>
  {#if saveNotice}
    <p class="note" role="status">{saveNotice}</p>
  {/if}
  {#if scheduleError}
    <p class="error" role="alert">{scheduleError}</p>
  {/if}
  {#if scheduleLoading && !scheduleLoaded}
    <p class="hint" aria-live="polite">Cargando horario…</p>
  {:else if scheduleLoaded}
    <div class="sched-card">
      <ul class="sched-list">
        {#each WEEKDAYS_DISPLAY as weekday (weekday)}
          {@const day = draftFor(weekday)}
          {#if day}
            <li class="sched-row" class:closed={!day.isOpen}>
              <div class="sched-head">
                <span class="sched-name">{WEEKDAY_LABELS[weekday]}</span>
                <button
                  type="button"
                  class="toggle"
                  class:on={day.isOpen}
                  role="switch"
                  aria-checked={day.isOpen}
                  aria-label={`Abrir o cerrar ${WEEKDAY_LABELS[weekday]}`}
                  disabled={savingSchedule}
                  onclick={() => toggleDay(day)}
                >
                  <span class="knob" aria-hidden="true"></span>
                </button>
              </div>
              <div class="sched-times">
                <label class="sr-label" for={`open-${weekday}`}>Apertura {WEEKDAY_LABELS[weekday]}</label>
                <input
                  class="input time"
                  id={`open-${weekday}`}
                  type="time"
                  value={day.openTime ?? ""}
                  disabled={!day.isOpen || savingSchedule}
                  oninput={(e) => setDraftWeekday(weekday, { openTime: e.currentTarget.value })}
                  aria-label={`Apertura ${WEEKDAY_LABELS[weekday]}`}
                />
                <span class="sched-sep" aria-hidden="true">a</span>
                <label class="sr-label" for={`close-${weekday}`}>Cierre {WEEKDAY_LABELS[weekday]}</label>
                <input
                  class="input time"
                  id={`close-${weekday}`}
                  type="time"
                  value={day.closeTime ?? ""}
                  disabled={!day.isOpen || savingSchedule}
                  oninput={(e) => setDraftWeekday(weekday, { closeTime: e.currentTarget.value })}
                  aria-label={`Cierre ${WEEKDAY_LABELS[weekday]}`}
                />
              </div>
            </li>
          {/if}
        {/each}
      </ul>
      <div class="sched-save-row">
        <button
          type="button"
          class="primary"
          disabled={savingSchedule}
          onclick={() => void saveSchedule()}
        >
          {savingSchedule ? "Guardando horario…" : "Guardar horario semanal"}
        </button>
        <p class="hint">Las citas y los horarios disponibles se recalculan con esta configuración.</p>
      </div>
    </div>
  {:else if !scheduleLoading && !scheduleLoaded && scheduleError}
    <!-- error already rendered above -->
  {/if}

  <!-- ================= Block manager (US2) ================= -->
  <h2 class="section-title">Bloqueos de disponibilidad</h2>

  <form class="block-form" onsubmit={(e) => { e.preventDefault(); void submitBlock(); }}>
    <fieldset class="mode-field">
      <legend class="sr-label">Tipo de bloqueo</legend>
      <label class="radio-chip">
        <input type="radio" name="block-mode" value="range" checked={blockMode === "range"} onchange={() => (blockMode = "range")} />
        Rango de horas
      </label>
      <label class="radio-chip">
        <input type="radio" name="block-mode" value="full_day" checked={blockMode === "full_day"} onchange={() => (blockMode = "full_day")} />
        Días completos
      </label>
    </fieldset>

    {#if blockMode === "range"}
      <div class="block-fields">
        <label class="field">
          <span>Fecha</span>
          <input class="input" type="date" bind:value={rangeDate} />
        </label>
        <label class="field">
          <span>Hora de inicio</span>
          <input class="input" type="time" bind:value={rangeStart} />
        </label>
        <label class="field">
          <span>Hora de fin</span>
          <input class="input" type="time" bind:value={rangeEnd} />
        </label>
      </div>
    {:else}
      <div class="block-fields">
        <label class="field">
          <span>Fecha de inicio</span>
          <input class="input" type="date" bind:value={fullStart} />
        </label>
        <label class="field">
          <span>Fecha de fin</span>
          <input class="input" type="date" bind:value={fullEnd} />
        </label>
      </div>
    {/if}

    <label class="field">
      <span>Motivo (opcional)</span>
      <input
        class="input"
        type="text"
        bind:value={reason}
        list="block-reasons"
        placeholder="Ej: Almuerzo, Personal, Feriado"
      />
    </label>
    <datalist id="block-reasons">
      <option value="Almuerzo" />
      <option value="Personal" />
      <option value="Mantenimiento" />
      <option value="Feriado" />
    </datalist>

    {#if blockError}
      <p class="error" role="alert">{blockError}</p>
    {/if}
    {#if collisionNotice}
      <p class="notice" role="status">{collisionNotice}</p>
    {/if}

    <button type="submit" class="primary" disabled={creatingBlock}>
      {creatingBlock ? "Creando bloqueo…" : "Crear Bloqueo"}
    </button>
  </form>

  <!-- Active blocks list -->
  {#if blocksError}
    <p class="error" role="alert">{blocksError}</p>
  {/if}
  {#if blocksLoading && !blocksLoaded}
    <p class="hint" aria-live="polite">Cargando bloqueos…</p>
  {:else if blocksLoaded}
    {#if blocks.length === 0}
      <p class="empty-state">No hay bloqueos activos.</p>
    {:else}
      <ul class="rows">
        {#each blocks as block (block.id)}
          <li class="row" class:busy={blockBusy[block.id]} aria-busy={blockBusy[block.id]}>
            <div class="row-main">
              <strong class="row-title">{block.reason || "Bloqueo"}</strong>
              {#if block.isFullDay}
                <span class="row-sub">Día completo · {blockStartDate(block)} → {fullDayEndLabel(block)}</span>
              {:else}
                <span class="row-sub">{blockStartDate(block)} · {blockStartTime(block)} – {blockEndTime(block)}</span>
              {/if}
            </div>
            <span class="badge badge-block">{block.isFullDay ? "Día completo" : "Rango"}</span>
            <button
              type="button"
              class="danger small"
              disabled={blockBusy[block.id]}
              onclick={() => askDeleteBlock(block)}
            >
              <Trash2 size={16} aria-hidden="true" /> Eliminar
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

{#if deletingBlock}
  <div class="backdrop" onclick={cancelDeleteBlock} role="presentation"></div>
  <section class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-block-title">
    <header class="modal-head">
      <h2 id="delete-block-title">Eliminar bloqueo</h2>
      <button type="button" class="icon-btn" onclick={cancelDeleteBlock} aria-label="Cerrar">
        <X size={20} />
      </button>
    </header>
    <p class="gate-hint">
      ¿Eliminar <strong>{deletingBlock.reason || "este bloqueo"}</strong>? Su horario volverá a estar
      disponible de inmediato.
    </p>
    {#if deleteError}
      <p class="error" role="alert">{deleteError}</p>
    {/if}
    <div class="modal-actions">
      <button type="button" class="ghost" onclick={cancelDeleteBlock} disabled={deleteBusy}>Cancelar</button>
      <button type="button" class="danger" onclick={() => void confirmDeleteBlock()} disabled={deleteBusy}>
        {deleteBusy ? "Eliminando…" : "Eliminar"}
      </button>
    </div>
  </section>
{/if}

<style>
  .schedule-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 820px;
  }

  .section-title {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-primary);
  }

  .sched-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sched-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 1rem 1.15rem;
  }

  /* Mobile-first: each weekday row is two lines —
     [day name + toggle] / [open "a" close]. Desktop (≥768px) restores one line. */
  .sched-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    min-width: 0;
    max-width: 100%;
    padding: 0.7rem 0.8rem;
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    border-radius: var(--radius-card);
    transition: opacity 160ms ease;
  }

  .sched-row.closed {
    opacity: 0.6;
  }

  .row.busy {
    opacity: 0.65;
  }

  /* Top line: day name (left, never wraps) + toggle (right). */
  .sched-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-width: 0;
  }

  .sched-name {
    min-width: 0;
    color: var(--text-primary);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Bottom line: full-width open/close pair. */
  .sched-times {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
  }

  .time {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  /* Desktop: original clean single row (name … toggle | open a close). */
  @media (min-width: 768px) {
    .sched-row {
      flex-direction: row;
      align-items: center;
      gap: 0.75rem;
    }

    .sched-head {
      flex: 1 1 auto;
    }

    .sched-name {
      flex: 1 1 auto;
    }

    .sched-times {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: auto;
    }

    .time {
      width: 110px;
    }
  }

  .input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .sched-sep {
    color: var(--text-muted);
  }

  .sched-save-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
    border-top: var(--divider-subtle);
    padding-top: 1rem;
  }

  .sched-save-row .hint {
    text-align: left;
    margin: 0;
  }

  .note {
    margin: 0;
    color: var(--accent-positive);
    font-size: 0.85rem;
  }

  .notice {
    margin: 0;
    color: var(--text-gold);
    font-size: 0.85rem;
  }

  .hint,
  .empty-state {
    color: var(--text-muted);
    text-align: center;
  }

  .error {
    color: var(--accent-negative);
    text-align: center;
  }

  .block-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 1rem 1.15rem;
  }

  .mode-field {
    display: flex;
    gap: 0.5rem;
    border: none;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
  }

  .radio-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0.4rem 0.9rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-weight: 600;
    cursor: pointer;
  }

  .radio-chip:has(input:checked) {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .block-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .input {
    min-height: 44px;
    max-width: 100%;
    min-width: 0;
    border-radius: var(--radius-btn);
    border: var(--border-card);
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    padding: 0.5rem 0.7rem;
    font: inherit;
  }

  .primary,
  .ghost,
  .danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-btn);
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  .small {
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.4rem 0.9rem;
  }

  .primary {
    align-self: flex-start;
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .ghost {
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    border: var(--border-btn-secondary);
  }

  .danger {
    background: transparent;
    color: var(--accent-negative);
    border: 1px solid var(--accent-negative);
  }

  .primary:disabled,
  .ghost:disabled,
  .danger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .primary:hover:not(:disabled),
  .ghost:hover:not(:disabled),
  .danger:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.75rem 0.9rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
  }

  .row-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .row-title {
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .row-sub {
    color: var(--text-secondary);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }

  .badge {
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .badge-block {
    background: var(--bg-wood-pill);
    color: var(--accent-wood);
    border: 1px dashed var(--accent-wood);
  }

  .toggle {
    flex: 0 0 auto;
    position: relative;
    width: 52px;
    height: 30px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    cursor: pointer;
    padding: 0;
  }

  .toggle .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: transform 160ms ease, background 160ms ease;
  }

  .toggle.on {
    background: var(--accent-primary);
  }

  .toggle.on .knob {
    transform: translateX(22px);
    background: var(--accent-on);
  }

  .toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .sr-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-backdrop);
    z-index: 40;
  }

  .modal {
    position: fixed;
    z-index: 41;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(440px, calc(100% - 2rem));
    max-height: 90vh;
    overflow-y: auto;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-glow);
    padding: 1.25rem;
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .modal-head h2 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
  }

  .gate-hint {
    color: var(--text-muted);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle .knob,
    .primary,
    .ghost,
    .danger {
      transition: none;
    }
  }
</style>