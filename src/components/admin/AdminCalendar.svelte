<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight, X } from "lucide-svelte";
  import { PIERCING_SERVICES } from "../../lib/data/services";
  import { DataError, dataStore } from "../../lib/data/store";
  import type { Booking, TimeBlock } from "../../lib/types/domain";
  import {
    addDays,
    buildOccupancies,
    calendarRows,
    heightForMinutes,
    isBusy,
    startOfWeek,
    timeAtOffsetY,
    topForTime,
    weekDays,
    type Occupancy,
  } from "../../lib/utils/calendar";
  import { formatCents } from "../../lib/utils/money";

  let weekStart = $state(startOfWeek(new Date()));
  let bookings = $state<Booking[]>([]);
  let blocks = $state<TimeBlock[]>([]);
  let loading = $state(false);
  let calError = $state("");

  // Booking modal
  let selected = $state<Booking | null>(null);
  let actionError = $state("");
  let rescheduling = $state(false);
  let reDate = $state("");
  let reSlots = $state<string[]>([]);

  // Block modals
  let creating = $state(false);
  let nbDate = $state("");
  let nbTime = $state("");
  let nbLabel = $state("Almuerzo");
  let nbDuration = $state<number>(30);
  let creatingError = $state("");
  let managing = $state<TimeBlock | null>(null);

  const days = $derived(weekDays(weekStart));
  const rows = calendarRows();

  function durationFor(serviceId: string): number {
    return PIERCING_SERVICES.find((service) => service.id === serviceId)?.durationMinutes ?? 30;
  }

  async function reload() {
    loading = true;
    calError = "";
    try {
      const [allBookings, allBlocks] = await Promise.all([
        dataStore.listBookings(),
        dataStore.listBlocks(),
      ]);
      bookings = allBookings;
      blocks = allBlocks;
    } catch (err) {
      calError = err instanceof DataError ? err.message : "No se pudo cargar la agenda";
    } finally {
      loading = false;
    }
  }

  function goWeek(delta: number) {
    weekStart = addDays(weekStart, delta * 7);
  }

  function occupanciesFor(date: string, excludeId?: string): Occupancy[] {
    return buildOccupancies(
      bookings.map((booking) => ({
        id: booking.id,
        date: booking.date,
        timeSlot: booking.timeSlot,
        status: booking.status,
        durationMinutes: durationFor(booking.serviceId),
      })),
      blocks,
      date,
      excludeId,
    );
  }

  function occupantAt(date: string, time: string): { kind: "booking" | "block"; id: string } | null {
    const booking = bookings.find(
      (b) =>
        b.date === date &&
        b.status !== "CANCELLED" &&
        isBusy([{ time: b.timeSlot, durationMinutes: durationFor(b.serviceId) }], time, 30),
    );
    if (booking) return { kind: "booking", id: booking.id };
    const block = blocks.find(
      (b) =>
        b.date === date &&
        isBusy([{ time: b.timeSlot, durationMinutes: b.durationMinutes }], time, 30),
    );
    if (block) return { kind: "block", id: block.id };
    return null;
  }

  function activateCell(date: string, time: string) {
    const occupant = occupantAt(date, time);
    if (!occupant) {
      nbDate = date;
      nbTime = time;
      creatingError = "";
      creating = true;
      return;
    }
    if (occupant.kind === "booking") {
      const booking = bookings.find((b) => b.id === occupant.id);
      if (booking) openBooking(booking);
    } else {
      const block = blocks.find((b) => b.id === occupant.id);
      if (block) managing = block;
    }
  }

  function onColumnClick(event: MouseEvent, date: string) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    activateCell(date, timeAtOffsetY(event.clientY - rect.top));
  }

  function onDayKeydown(event: KeyboardEvent, date: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    // Keyboard activation uses the first row of the day column.
    activateCell(date, rows[0]);
  }

  function openBooking(booking: Booking) {
    selected = booking;
    actionError = "";
    rescheduling = false;
  }

  function closeBooking() {
    selected = null;
    rescheduling = false;
  }

  // --- Booking actions ---
  async function confirmSeña() {
    if (!selected) return;
    actionError = "";
    try {
      bookings = await dataStore.updateBookingStatus(selected.id, "CONFIRMED");
      selected = null;
      await reload();
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo confirmar";
    }
  }

  async function cancelCita() {
    if (!selected) return;
    actionError = "";
    try {
      await dataStore.updateBookingStatus(selected.id, "CANCELLED");
      selected = null;
      await reload();
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo cancelar";
    }
  }

  function startReschedule() {
    if (!selected) return;
    rescheduling = true;
    reDate = selected.date;
    rebuildReSlots();
  }

  function rebuildReSlots() {
    if (!selected || !reDate) {
      reSlots = [];
      return;
    }
    const occ = occupanciesFor(reDate, selected.id);
    const dur = durationFor(selected.serviceId);
    reSlots = rows.filter((slot) => !isBusy(occ, slot, dur));
  }

  async function applyReschedule(slot: string) {
    if (!selected || !reDate) return;
    actionError = "";
    try {
      await dataStore.updateBookingSchedule(selected.id, { date: reDate, timeSlot: slot });
      selected = null;
      rescheduling = false;
      await reload();
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo reagendar";
    }
  }

  // --- Block actions ---
  async function submitBlock() {
    if (!nbDate || !nbTime || !nbLabel.trim()) {
      creatingError = "Completá la etiqueta del bloqueo";
      return;
    }
    creatingError = "";
    try {
      await dataStore.createBlock({
        date: nbDate,
        timeSlot: nbTime,
        durationMinutes: nbDuration,
        label: nbLabel.trim(),
      });
      creating = false;
      await reload();
    } catch (err) {
      creatingError = err instanceof DataError ? err.message : "No se pudo crear el bloqueo";
    }
  }

  async function deleteManagedBlock() {
    if (!managing) return;
    try {
      await dataStore.deleteBlock(managing.id);
      managing = null;
      await reload();
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo eliminar el bloqueo";
    }
  }

  onMount(() => void reload());
</script>

<section class="calendar" aria-label="Calendario semanal">
  <header class="cal-head">
    <button type="button" class="nav" onclick={() => goWeek(-1)} aria-label="Semana anterior">
      <ChevronLeft size={20} />
    </button>
    <span class="cal-title">
      Semana del {days[0].date} al {days[6].date}
    </span>
    <button type="button" class="nav" onclick={() => goWeek(1)} aria-label="Semana siguiente">
      <ChevronRight size={20} />
    </button>
  </header>

  {#if loading}
    <p class="hint" aria-live="polite">Cargando agenda…</p>
  {:else if calError}
    <p class="error" role="alert">{calError}</p>
  {:else}
    <div class="scroll">
      <div class="grid">
        <div class="timecol" aria-hidden="true">
          {#each rows as row (row)}
            <span class="time-label">{row}</span>
          {/each}
        </div>

        {#each days as day (day.date)}
          <div
            class="daycol"
            class:today={day.isToday}
            role="button"
            tabindex="0"
            aria-label={`Agenda del ${day.label}. Usar Enter o Espacio para bloquear un horario o ver una cita.`}
            onclick={(e) => onColumnClick(e, day.date)}
            onkeydown={(e) => onDayKeydown(e, day.date)}
          >
            <span class="day-head">{day.label}</span>
            {#each blocks.filter((b) => b.date === day.date) as block (block.id)}
              <button
                type="button"
                class="card block"
                style={`top: ${topForTime(block.timeSlot)}px; height: ${heightForMinutes(block.durationMinutes)}px;`}
                onclick={(e) => { e.stopPropagation(); managing = block; }}
                aria-label={`Bloqueo ${block.label} ${block.timeSlot}`}
              >
                <span class="ev-time">{block.timeSlot}</span>
                <span class="ev-title">{block.label}</span>
              </button>
            {/each}
            {#each bookings.filter((b) => b.date === day.date && b.status !== "CANCELLED") as booking (booking.id)}
              <button
                type="button"
                class="card booking {booking.status.toLowerCase()}"
                style={`top: ${topForTime(booking.timeSlot)}px; height: ${heightForMinutes(durationFor(booking.serviceId))}px;`}
                onclick={(e) => { e.stopPropagation(); openBooking(booking); }}
                aria-label={`${booking.timeSlot} ${booking.clientName} ${booking.serviceName}`}
              >
                <span class="ev-time">{booking.timeSlot}</span>
                <span class="ev-title">{booking.clientName} ({booking.serviceName})</span>
              </button>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <p class="hint">Clic en una cita para ver el detalle; clic en un espacio libre para bloquearlo.</p>
  {/if}
</section>

{#if selected}
  <div class="backdrop" onclick={closeBooking} role="presentation"></div>
  <section class="modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
    <header class="modal-head">
      <h2 id="booking-modal-title">Detalle de la cita</h2>
      <button type="button" class="icon-btn" onclick={closeBooking} aria-label="Cerrar">
        <X size={20} />
      </button>
    </header>

    <dl class="detail">
      <dt>Cliente</dt>
      <dd>{selected.clientName}</dd>
      <dt>WhatsApp</dt>
      <dd>{selected.clientWhatsapp}</dd>
      <dt>Servicio</dt>
      <dd>{selected.serviceName}</dd>
      <dt>Fecha / Hora</dt>
      <dd>{selected.date} · {selected.timeSlot}</dd>
      <dt>Precio total</dt>
      <dd>{formatCents(selected.priceCents)}</dd>
      <dt>Seña (50%)</dt>
      <dd class="gold">{formatCents(selected.depositCents)}</dd>
      <dt>Saldo en el local</dt>
      <dd>{formatCents(selected.priceCents - selected.depositCents)}</dd>
      <dt>Estado</dt>
      <dd><span class="badge badge-{selected.status.toLowerCase()}">{selected.status}</span></dd>
    </dl>

    {#if !rescheduling}
      <div class="actions">
        {#if selected.status === "PENDING"}
          <button type="button" class="primary" onclick={confirmSeña}>Confirmar Seña</button>
        {/if}
        <button type="button" class="ghost" onclick={startReschedule}>Reagendar</button>
        {#if selected.status !== "CANCELLED"}
          <button type="button" class="danger" onclick={cancelCita}>Cancelar Cita</button>
        {/if}
      </div>
    {:else}
      <div class="reschedule">
        <label class="field" for="re-date">Nueva fecha</label>
        <input class="input" id="re-date" type="date" bind:value={reDate} onchange={rebuildReSlots} />
        <label class="field">Nuevo horario (disponibles)</label>
        {#if reSlots.length === 0}
          <p class="hint">No hay horarios libres para esta fecha.</p>
        {:else}
          <div class="slot-grid">
            {#each reSlots as slot (slot)}
              <button type="button" class="slot" onclick={() => applyReschedule(slot)}>
                {slot}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if actionError}
      <p class="error" role="alert">{actionError}</p>
    {/if}
  </section>
{/if}

{#if creating}
  <div class="backdrop" onclick={() => (creating = false)} role="presentation"></div>
  <section class="modal" role="dialog" aria-modal="true" aria-labelledby="block-modal-title">
    <header class="modal-head">
      <h2 id="block-modal-title">Crear Bloqueo</h2>
      <button type="button" class="icon-btn" onclick={() => (creating = false)} aria-label="Cerrar">
        <X size={20} />
      </button>
    </header>

    <form onsubmit={(e) => { e.preventDefault(); submitBlock(); }}>
      <p class="hint-block">{nbDate} · {nbTime}</p>
      <label class="field" for="nb-label">Etiqueta</label>
      <input class="input" id="nb-label" type="text" list="block-labels" bind:value={nbLabel} />
      <datalist id="block-labels">
        <option value="Almuerzo" />
        <option value="Personal" />
        <option value="Mantenimiento" />
      </datalist>

      <label class="field" for="nb-duration">Duración (min)</label>
      <select class="input" id="nb-duration" bind:value={nbDuration}>
        <option value={15}>15</option>
        <option value={30}>30</option>
        <option value={60}>60</option>
        <option value={90}>90</option>
        <option value={120}>120</option>
      </select>

      {#if creatingError}
        <p class="error" role="alert">{creatingError}</p>
      {/if}

      <div class="modal-actions">
        <button type="button" class="ghost" onclick={() => (creating = false)}>Cancelar</button>
        <button type="submit" class="primary">Crear Bloqueo</button>
      </div>
    </form>
  </section>
{/if}

{#if managing}
  <div class="backdrop" onclick={() => (managing = null)} role="presentation"></div>
  <section class="modal" role="dialog" aria-modal="true" aria-labelledby="manage-modal-title">
    <header class="modal-head">
      <h2 id="manage-modal-title">Bloqueo</h2>
      <button type="button" class="icon-btn" onclick={() => (managing = null)} aria-label="Cerrar">
        <X size={20} />
      </button>
    </header>
    <dl class="detail">
      <dt>Etiqueta</dt>
      <dd>{managing.label}</dd>
      <dt>Fecha / Hora</dt>
      <dd>{managing.date} · {managing.timeSlot}</dd>
      <dt>Duración</dt>
      <dd>{managing.durationMinutes} min</dd>
    </dl>
    {#if actionError}
      <p class="error" role="alert">{actionError}</p>
    {/if}
    <div class="actions">
      <button type="button" class="danger" onclick={deleteManagedBlock}>Eliminar Bloqueo</button>
      <button type="button" class="ghost" onclick={() => (managing = null)}>Cerrar</button>
    </div>
  </section>
{/if}

<style>
  .calendar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .cal-title {
    color: var(--text-primary);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .scroll {
    overflow-x: auto;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-app-body);
  }

  .grid {
    display: grid;
    grid-template-columns: 60px repeat(7, minmax(120px, 1fr));
    min-width: 900px;
    height: 840px;
  }

  .timecol {
    display: flex;
    flex-direction: column;
    border-right: var(--border-card);
  }

  .time-label {
    height: 40px;
    padding-right: 0.5rem;
    text-align: right;
    color: var(--text-muted);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    transform: translateY(-8px);
  }

  .daycol {
    position: relative;
    border-right: var(--divider-subtle);
    cursor: cell;
    background: repeating-linear-gradient(
      180deg,
      transparent 0 39px,
      var(--divider-subtle) 39px 40px
    );
  }

  .daycol:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: -2px;
  }

  .daycol.today {
    background-color: var(--bg-gold-faint);
  }

  .day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: block;
    text-align: center;
    padding: 0.35rem 0;
    background: var(--bg-card-light);
    border-bottom: var(--divider-subtle);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .card {
    position: absolute;
    left: 4px;
    right: 4px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.3rem 0.45rem;
    border-radius: var(--radius-image);
    text-align: left;
    font: inherit;
    cursor: pointer;
    overflow: hidden;
  }

  .card.booking.confirmed {
    background: var(--bg-card-light);
    border: 1px solid var(--accent-primary);
    box-shadow: var(--shadow-glow);
    color: var(--text-primary);
  }

  .card.booking.pending {
    background: var(--bg-card-translucent);
    border: 1px dashed var(--accent-gold);
    color: var(--text-secondary);
  }

  .card.block {
    background: var(--bg-wood-pill);
    border: 1px dashed var(--accent-wood);
    color: var(--accent-wood);
  }

  .ev-time {
    font-size: 0.7rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .ev-title {
    font-size: 0.72rem;
    line-height: 1.2;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: center;
  }

  .error {
    color: var(--accent-negative);
    text-align: center;
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
    margin-bottom: 1rem;
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

  .detail {
    margin: 0 0 1rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 1rem;
  }

  .detail dt {
    color: var(--text-muted);
    font-size: 0.82rem;
  }

  .detail dd {
    margin: 0;
    color: var(--text-primary);
    text-align: right;
  }

  .detail dd.gold {
    color: var(--text-gold);
    font-weight: 700;
  }

  .badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .badge-pending {
    background: var(--bg-wood-pill);
    color: var(--accent-gold);
  }

  .badge-confirmed {
    background: var(--accent-positive-tint);
    color: var(--accent-positive);
  }

  .badge-cancelled {
    background: var(--accent-negative-tint);
    color: var(--accent-negative);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .primary,
  .ghost,
  .danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-btn);
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  .primary {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
  }

  .ghost {
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    border: var(--border-btn-secondary);
    transition: border-color 160ms ease;
  }

  .ghost:hover {
    border: var(--border-btn-secondary-hover);
  }

  .danger {
    background: transparent;
    color: var(--accent-negative);
    border: 1px solid var(--accent-negative);
  }

  .reschedule {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }

  .slot-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .slot {
    min-height: 40px;
    padding: 0.35rem 0.8rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
  }

  .hint-block {
    margin: 0;
    color: var(--text-gold);
    font-weight: 700;
  }

  .modal form {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
</style>