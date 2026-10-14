<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight, X } from "lucide-svelte";
  import { DataError, dataStore } from "../../lib/data/store";
  import { getDayAvailability } from "../../lib/services/availability";
  import { BOOKING_STATUS_LABELS } from "../../lib/utils/booking";
  import { localISODate } from "../../lib/utils/dates";
  import { blockOverlapsDay, localDateFromISO, localTimeFromISO } from "../../lib/utils/availability";
  import type { Booking, AvailabilityBlock } from "../../lib/types/domain";
  import {
    addMonths,
    dayStatusSummary,
    monthGrid,
    monthLabel,
    startOfMonth,
  } from "../../lib/utils/calendar";
  import AdminBookingDetail from "./AdminBookingDetail.svelte";

  const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

  let monthStart = $state(startOfMonth(new Date()));
  let selectedDate = $state<string>(localISODate(new Date()));
  let bookings = $state<Booking[]>([]);
  let blocks = $state<AvailabilityBlock[]>([]);
  let durations = $state<Record<string, number>>({});
  let loading = $state(false);
  let calError = $state("");

  // Booking detail / reschedule
  let selected = $state<Booking | null>(null);
  let actionError = $state("");
  let rescheduling = $state(false);
  let reDate = $state("");
  let reSlots = $state<string[]>([]);

  const cells = $derived(monthGrid(monthStart));
  const monthCells = $derived(cells.filter((cell) => cell.inMonth));
  const monthTitle = $derived(monthLabel(monthStart));
  const selectedBookings = $derived(
    bookings
      .filter((booking) => booking.date === selectedDate)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
  );
  const selectedBlocks = $derived(
    blocks
      .filter((block) => blockOverlapsDay(block, selectedDate))
      .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime)),
  );

  function dateFromISO(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function weekdayShort(iso: string): string {
    return dateFromISO(iso).toLocaleDateString("es", { weekday: "short" });
  }

  function dayLabel(iso: string): string {
    const label = dateFromISO(iso).toLocaleDateString("es", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function durationFor(serviceId: string | null): number {
    if (!serviceId) return 30;
    return durations[serviceId] ?? 30;
  }

  // Read-only block row labels (feature 017). Full-day end_datetime is exclusive.
  function fullDayEndLabel(block: AvailabilityBlock): string {
    const end = new Date(new Date(block.endDatetime).getTime() - 24 * 60 * 60 * 1000);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const d = String(end.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function blockTimeLabel(block: AvailabilityBlock): string {
    if (block.isFullDay) return "Todo el día";
    return `${localTimeFromISO(block.startDatetime)} – ${localTimeFromISO(block.endDatetime)}`;
  }

  function blockLabel(block: AvailabilityBlock): string {
    if (block.isFullDay) {
      return `Bloqueo día completo ${localDateFromISO(block.startDatetime)} al ${fullDayEndLabel(block)}`;
    }
    return `Bloqueo ${localDateFromISO(block.startDatetime)} ${blockTimeLabel(block)} ${block.reason}`;
  }

  async function reload() {
    loading = true;
    calError = "";
    try {
      const [allBookings, allBlocks, allServices] = await Promise.all([
        dataStore.listBookings(),
        dataStore.listBlocks(),
        dataStore.listServices({ includeInactive: true }),
      ]);
      bookings = allBookings;
      blocks = allBlocks;
      durations = Object.fromEntries(
        allServices.map((service) => [service.id, service.durationMinutes]),
      );
    } catch (err) {
      calError = err instanceof DataError ? err.message : "No se pudo cargar la agenda";
    } finally {
      loading = false;
    }
  }

  function goMonth(delta: number) {
    const next = addMonths(monthStart, delta);
    monthStart = next;
    const first = localISODate(startOfMonth(next));
    const today = localISODate(new Date());
    selectedDate = today.slice(0, 7) === first.slice(0, 7) ? today : first;
  }

  function goToday() {
    monthStart = startOfMonth(new Date());
    selectedDate = localISODate(new Date());
  }

  function selectDay(date: string) {
    selectedDate = date;
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

  /** Patches the agenda in place after a detail action (feature 018). */
  function onBookingChanged(updated: Booking) {
    selected = updated;
    bookings = bookings.map((booking) => (booking.id === updated.id ? updated : booking));
  }

  function startReschedule(target?: Booking) {
    const booking = target ?? selected;
    if (!booking) return;
    selected = booking;
    rescheduling = true;
    reDate = booking.date;
    rebuildReSlots();
  }

  async function rebuildReSlots() {
    if (!selected || !reDate) {
      reSlots = [];
      return;
    }
    // Feature 017: schedule-aware availability — honours working hours and
    // range/full-day blocks, excluding the booking being moved.
    try {
      const availability = await getDayAvailability(reDate, durationFor(selected.serviceId), selected.id);
      reSlots = availability.slots;
    } catch {
      reSlots = [];
    }
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

  onMount(() => void reload());
</script>

<section class="calendar" aria-label="Calendario mensual">
  <header class="cal-head">
    <button type="button" class="nav" onclick={() => goMonth(-1)} aria-label="Mes anterior">
      <ChevronLeft size={20} />
    </button>
    <span class="cal-title">{monthTitle}</span>
    <button type="button" class="nav" onclick={() => goMonth(1)} aria-label="Mes siguiente">
      <ChevronRight size={20} />
    </button>
    <button type="button" class="today-btn" onclick={goToday}>Hoy</button>
  </header>

  {#if loading}
    <p class="hint" aria-live="polite">Cargando agenda…</p>
  {:else if calError}
    <p class="error" role="alert">{calError}</p>
  {:else}
    <!-- Desktop ≥768px: monthly grid -->
    <div class="grid-wrap">
      <div class="weekdays" aria-hidden="true">
        {#each WEEKDAYS as wd (wd)}
          <span>{wd}</span>
        {/each}
      </div>
      <div class="month-grid">
        {#each cells as cell (cell.date)}
          {@const summary = dayStatusSummary(bookings, cell.date)}
          <button
            type="button"
            class="day-cell"
            class:out={!cell.inMonth}
            class:today={cell.isToday}
            class:selected={selectedDate === cell.date}
            disabled={!cell.inMonth}
            aria-current={selectedDate === cell.date ? "date" : undefined}
            aria-label={`${dayLabel(cell.date)}: ${summary.total} ${
              summary.total === 1 ? "cita" : "citas"
            }`}
            onclick={() => selectDay(cell.date)}
          >
            <span class="cell-num">{cell.dayNumber}</span>
            {#if summary.total > 0}
              <span class="cell-badge">{summary.total}</span>
              <span class="cell-dots">
                {#if summary.pending > 0}
                  <span class="dot pending" title={`${summary.pending} pendientes`}></span>
                {/if}
                {#if summary.confirmed > 0}
                  <span class="dot confirmed" title={`${summary.confirmed} confirmadas`}></span>
                {/if}
                {#if summary.cancelled > 0}
                  <span class="dot cancelled" title={`${summary.cancelled} canceladas`}></span>
                {/if}
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Mobile <768px: horizontally scrollable day selector -->
    <div class="day-strip" role="group" aria-label="Selector de día">
      {#each monthCells as cell (cell.date)}
        {@const summary = dayStatusSummary(bookings, cell.date)}
        <button
          type="button"
          class="day-chip"
          class:today={cell.isToday}
          class:selected={selectedDate === cell.date}
          aria-current={selectedDate === cell.date ? "date" : undefined}
          aria-label={`${dayLabel(cell.date)}: ${summary.total} ${
            summary.total === 1 ? "cita" : "citas"
          }`}
          onclick={() => selectDay(cell.date)}
        >
          <span class="chip-wd">{weekdayShort(cell.date)}</span>
          <span class="chip-num">{cell.dayNumber}</span>
          {#if summary.total > 0}
            <span class="chip-dot" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Day detail (below the grid on desktop, below the strip on mobile) -->
    <section class="day-detail" aria-labelledby="day-detail-title">
      <div class="detail-head">
        <h2 id="day-detail-title">{dayLabel(selectedDate)}</h2>
        <span class="ghost small hint-static">Bloqueos: pestaña Horarios</span>
      </div>

      {#if selectedBookings.length === 0 && selectedBlocks.length === 0}
        <p class="empty">Sin citas este día.</p>
      {:else}
        <ul class="day-list">
          {#each selectedBookings as booking (booking.id)}
            <li>
              <button
                type="button"
                class="appt"
                onclick={() => openBooking(booking)}
                aria-label={`${booking.timeSlot} ${booking.clientName} ${booking.serviceName} ${
                  BOOKING_STATUS_LABELS[booking.status]
                }`}
              >
                <span class="appt-time">{booking.timeSlot}</span>
                <span class="appt-main">
                  <span class="appt-title">{booking.clientName}</span>
                  <span class="appt-service">
                    {booking.serviceName} · {durationFor(booking.serviceId)} min
                  </span>
                  {#if booking.notes}
                    <span class="appt-notes">{booking.notes}</span>
                  {/if}
                </span>
                <span class="badge badge-{booking.status.toLowerCase()}">
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>
              </button>
            </li>
          {/each}

          {#each selectedBlocks as block (block.id)}
            <li>
              <div class="appt block-row read-only" aria-label={blockLabel(block)}>
                <span class="appt-time">{blockTimeLabel(block)}</span>
                <span class="appt-main">
                  <span class="appt-title">{block.reason || "Bloqueo"}</span>
                  <span class="appt-service">{block.isFullDay ? "Día completo" : "Bloqueo"}</span>
                </span>
                <span class="badge badge-block">{block.isFullDay ? "Día completo" : "Rango"}</span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</section>

{#if selected && !rescheduling}
  <AdminBookingDetail
    booking={selected}
    onClose={closeBooking}
    onChanged={onBookingChanged}
    onReschedule={startReschedule}
  />
{:else if selected && rescheduling}
  <div class="backdrop" onclick={closeBooking} role="presentation"></div>
  <section class="modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
    <header class="modal-head">
      <h2 id="booking-modal-title">Reagendar cita</h2>
      <button type="button" class="icon-btn" onclick={closeBooking} aria-label="Cerrar">
        <X size={20} />
      </button>
    </header>

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

    {#if actionError}
      <p class="error" role="alert">{actionError}</p>
    {/if}
  </section>
{/if}

<style>
  .calendar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cal-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cal-title {
    flex: 1;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
    text-transform: capitalize;
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
    flex: 0 0 auto;
  }

  .nav:hover,
  .nav:focus-visible,
  .today-btn:hover,
  .today-btn:focus-visible {
    color: var(--accent-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .today-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.4rem 1rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-weight: 600;
    cursor: pointer;
    flex: 0 0 auto;
  }

  /* ---- Desktop monthly grid (≥768px) ---- */
  .grid-wrap {
    display: block;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-app-body);
    padding: 0.75rem;
  }

  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .weekdays span {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
  }

  .day-cell {
    position: relative;
    min-height: 76px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    padding: 0.4rem 0.45rem;
    text-align: left;
    background: var(--bg-card-light);
    border: 1px solid transparent;
    border-radius: var(--radius-image);
    color: var(--text-primary);
    font: inherit;
    cursor: pointer;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .day-cell:hover:not(:disabled),
  .day-cell:focus-visible {
    border-color: var(--accent-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 1px;
  }

  .day-cell.out {
    background: transparent;
    color: var(--text-muted);
    border-color: transparent;
    cursor: default;
  }

  .day-cell.today {
    background: var(--bg-gold-faint);
  }

  .day-cell.selected {
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-glow);
  }

  .cell-num {
    font-size: 0.85rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .cell-badge {
    align-self: flex-end;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    background: var(--accent-primary);
    color: var(--accent-on);
    font-size: 0.7rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .cell-dots {
    display: inline-flex;
    gap: 0.2rem;
    margin-top: auto;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot.pending {
    background: var(--accent-gold);
  }

  .dot.confirmed {
    background: var(--accent-positive);
  }

  .dot.cancelled {
    background: var(--accent-negative);
  }

  /* ---- Mobile day selector (<768px) ---- */
  .day-strip {
    display: none;
    gap: 0.4rem;
    overflow-x: auto;
    padding-bottom: 0.35rem;
    -webkit-overflow-scrolling: touch;
  }

  .day-chip {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    min-width: 52px;
    min-height: 60px;
    padding: 0.35rem 0.5rem;
    border-radius: var(--radius-image);
    border: var(--border-card);
    background: var(--bg-card-light);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .day-chip.today {
    background: var(--bg-gold-faint);
  }

  .day-chip.selected {
    border-color: var(--accent-primary);
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .day-chip:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .chip-wd {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .chip-num {
    font-size: 0.95rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-gold);
  }

  .day-chip.selected .chip-dot {
    background: var(--accent-on);
  }

  /* ---- Day detail (shared) ---- */
  .day-detail {
    border-top: var(--divider-subtle);
    padding-top: 1rem;
  }

  .detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .detail-head h2 {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-primary);
    text-transform: capitalize;
    overflow-wrap: anywhere;
  }

  .day-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .appt {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.9rem;
    text-align: left;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    color: var(--text-primary);
    font: inherit;
    cursor: pointer;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .appt:hover,
  .appt:focus-visible {
    border-color: var(--accent-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 1px;
  }

  .appt-time {
    flex: 0 0 auto;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .appt-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .appt-title {
    font-weight: 700;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .appt-service,
  .appt-notes {
    color: var(--text-secondary);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }

  .appt-notes {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .block-row {
    border-style: dashed;
    border-color: var(--accent-wood);
  }

  .appt.read-only {
    cursor: default;
  }

  .appt.read-only:hover,
  .appt.read-only:focus-visible {
    border-color: var(--accent-wood);
    outline: none;
  }

  .empty {
    margin: 0;
    color: var(--text-muted);
    text-align: center;
    padding: 1.25rem 0;
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

  .badge {
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .badge-pending {
    background: var(--status-pending-bg);
    color: var(--text-gold);
    border: 1px solid var(--status-pending-edge);
  }

  .badge-confirmed,
  .badge-completed {
    background: var(--status-confirmed-bg);
    color: var(--accent-positive);
    border: 1px solid var(--status-confirmed-edge);
  }

  .badge-cancelled,
  .badge-rejected {
    background: var(--status-rejected-bg);
    color: var(--accent-negative);
    border: 1px solid var(--status-rejected-edge);
  }

  .badge-block {
    background: var(--bg-wood-pill);
    color: var(--accent-wood);
    border: 1px dashed var(--accent-wood);
  }

  .ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-btn);
    font-weight: 600;
    cursor: pointer;
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    border: var(--border-btn-secondary);
    transition: border-color 160ms ease;
  }

  .ghost:hover {
    border: var(--border-btn-secondary-hover);
  }

  .small {
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.4rem 0.9rem;
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

  .slot:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .hint-static {
    color: var(--text-muted);
    font-size: 0.85rem;
    padding: 0.4rem 0.9rem;
  }

  /* Breakpoint switch: grid on desktop, day strip on mobile. */
  @media (max-width: 767px) {
    .grid-wrap {
      display: none;
    }

    .day-strip {
      display: flex;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .day-cell,
    .appt,
    .ghost {
      transition: none;
    }
  }
</style>
