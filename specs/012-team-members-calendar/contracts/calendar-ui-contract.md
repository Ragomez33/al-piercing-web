# Contract: Monthly Admin Calendar (Desktop Grid + Mobile Day List)

**Feature**: 012-team-members-calendar · **Phase**: 1 (Design & Contracts)

Replaces the weekly time-matrix defined by feature 006
(`specs/006-admin-calendar/contracts/calendar-ui-contract.md`). Data access and the booking status
transition boundary are unchanged.

## 1. Scope & tabs

- Still rendered by `AdminCalendar.svelte` **inside** the existing `AdminPanel` island (no new island; the
  default tab remains `Calendario`, `/admin?tab=calendar`).
- Data loaded in one pass on mount and after every mutation: `dataStore.listBookings()`,
  `dataStore.listBlocks()`, and `dataStore.listServices({ includeInactive: true })` for the
  `id → durationMinutes` map.

## 2. Desktop monthly grid (≥768px)

- Header: `‹ [month year] ›` pager (e.g. "octubre 2026") plus a `[Hoy]` shortcut. Weekday header
  **lun … dom** (Monday start).
- Grid: exactly **42 cells** (6 rows × 7 columns) from `monthGrid(monthStart)`. Cells outside the current
  month are dimmed and non-actionable (or selectable but visually muted).
- Each in-month cell shows:
  - the day number,
  - a **badge** with the non-cancelled appointment count (`dayStatusSummary.total`), hidden when `0`,
  - up to three status dots with counts (pending / confirmed / cancelled), using status tokens.
- The **selected** day is highlighted (gold border/`--shadow-glow`); today is marked.
- Clicking a day sets the selected day (it does **not** open a modal directly).

## 3. Day detail (desktop)

- Below the grid, the selected day's detail lists, in chronological order:
  - **appointments** — `HH:mm`, client, service name, status badge, service duration; clicking opens the
    booking detail modal;
  - **time blocks** — label + `HH:mm` + duration; clicking opens the block modal with a delete action.
- A `[Nuevo bloqueo]` button (pre-filled with the selected date) preserves manual blocking.
- Empty selected day → elegant empty state ("Sin citas este día").

## 4. Mobile (<768px): day strip + vertical list

- The grid is replaced by:
  1. a **horizontally scrollable day selector** (day chips for the month; today + selected highlighted;
     scrolls internally with `overflow-x: auto`; the page never scrolls horizontally), and
  2. a **vertical appointment list** for the selected day, each card showing a clear service breakdown
     (`HH:mm`, client, **service name**, status badge, notes when present) plus block entries.
- Default selected day: **today** (or the first day of the displayed month when today is in another month).
- Month pager remains available; selecting a day updates the list.
- No `<table>`; cards use flex/grid with `min-width: 0` and wrapping so nothing overflows at 320px.

## 5. Booking detail modal (both layouts)

- Content unchanged from feature 006: client, WhatsApp, service, date/time, **Precio total**,
  **Seña (50%)**, **Saldo en el local** (integer cents), status badge, notes.
- Actions (each reloads data after success):
  - `[Aprobar Cita]` (`PENDING` only) → `approveBooking(id, WHATSAPP_PHONE)`
    (`src/lib/services/booking.ts`), exposing the confirmation WhatsApp link when confirmed.
  - `[Reagendar]` → date input + free slot pills from
    `buildOccupancies(...)`/`isBusy(...)`/`calendarRows()`; submit → `dataStore.updateBookingSchedule(id, { date, timeSlot })`.
    Occupied slots are disabled/validated (exclusivity preserved).
  - `[Cancelar Cita]` (not cancelled) → `cancelBooking(id)`.
- Errors inline (`role="alert"`).

## 6. Block create / manage modal

- Triggered by `[Nuevo bloqueo]` (selected day) — the day matrix no longer maps clicks to times, so the
  start time is chosen from a slot select (09:00–19:30, 30-min steps) plus a label and duration
  (15/30/60/90/120, default 30). Submit → `dataStore.createBlock`.
- Block management modal shows label/date/time/duration and `[Eliminar Bloqueo]` → `dataStore.deleteBlock`.

## 7. Helpers (`src/lib/utils/calendar.ts`)

```ts
startOfMonth(date: Date): Date;
addMonths(date: Date, delta: number): Date;
monthLabel(date: Date): string;             // e.g. "octubre 2026"
monthGrid(monthStart: Date): MonthDayCell[]; // exactly 42 cells, Monday start
dayStatusSummary(
  bookings: { date: string; status: string }[],
  date: string,
): { total: number; pending: number; confirmed: number; cancelled: number };
```

Existing `calendarRows()`, `buildOccupancies()`, `isBusy()` are reused for reschedule/block validation.
Weekly geometry helpers (`topForTime`, `heightForMinutes`, `timeAtOffsetY`, …) may be pruned if unused.

## 8. Visual & accessibility rules

- Tokens only; status colors reuse `--accent-gold` (PENDING), `--accent-positive` (CONFIRMED),
  `--accent-negative` (CANCELLED/actions); grid lines use `--divider-subtle`.
- Day cells are buttons/keyboard-activatable with `aria-label` including the date and appointment count;
  the selected day uses `aria-current="date"`.
- Modals: `role="dialog"`, `aria-labelledby`, `Escape`/backdrop close, focus lands on the dialog;
  targets ≥44px; reduced motion honored.
- The page never scrolls horizontally from 320px to 1920px; only the mobile day strip scrolls internally.
