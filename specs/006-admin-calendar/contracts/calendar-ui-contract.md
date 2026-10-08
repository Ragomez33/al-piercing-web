# Calendar UI Contract: Interactive Admin Calendar

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

## 1. Tab & Scope

- `AdminPanel` tabs become **Calendario** (default, `/admin?tab=calendar`) and **Inventario**
  (`/admin?tab=catalog`). The flat bookings list is removed (spec §Assumptions).
- The calendar is rendered by `AdminCalendar.svelte`, composed inside the `AdminPanel` island
  (no new `client:` island).

## 2. Weekly Grid

- Columns = the 7 days of the current week (**Monday–Sunday**), day name + short date header.
- Rows = 30-minute bands from **09:00 to 19:30** (21 rows), labeled at the left (09:00 … 19:30).
- Previous/next week pager; current-week indicator.
- Row height 40px (80px/hour, 1.333 px/min); grid lines use the new `--divider-subtle`
  (`rgba(255, 255, 255, 0.05)`).
- Scroll: the grid scrolls horizontally inside its own container (min-width ≈ 900px); the page never
  scrolls horizontally (FR-012 / SC-004).

## 3. Event & Block Cards

- **Booking card**: positioned via `top = (startMin − 540) × 1.333`, `height = durationMin × 1.333`.
  - `CONFIRMED`: solid `--bg-card-light` (`#1A1A1E`) with gold border `--accent-primary` (`#E5A93C`)
    and `--shadow-glow`.
  - `PENDING`: translucent card (e.g. `rgba(26, 26, 30, 0.6)` + gold dashed border), dimmer text.
  - Label: `HH:mm – Client (Service)` (e.g. `14:30 – Carlos P. (Nostril)`).
- **Block card**: translucent wood/gold style (`--bg-wood-pill` border) labeled with the block label
  and `HH:mm`.
- Cursor: pointer on events/blocks; events open the booking modal, blocks open the block modal.

## 4. Booking Detail Modal

- Full data: WhatsApp/contact, service name, date/time, **Precio total**, **Seña (50%)**, **Saldo en
  el local** (`total − seña`, integer cents), status badge.
- Actions (each reloads the week after success):
  - `[Confirmar Seña]` → `updateBookingStatus(id, "CONFIRMED")` (only while `PENDING`).
  - `[Reagendar]` → reveals date input + free time-slot pills for that date; submit →
    `updateBookingSchedule(id, { date, timeSlot })`; targets occupied by another active booking or a
    block are disabled/validated (FR-009/Availability).
  - `[Cancelar Cita]` → `updateBookingStatus(id, "CANCELLED")` (only while not cancelled).
- Errors inline (`DataError`) with `role="alert"`.

## 5. Block Creation Modal

- Triggered by clicking a **free** grid cell; the cell's date + start time are pre-filled.
- Fields: **Etiqueta** (select: "Almuerzo", "Personal", "Mantenimiento", or custom text) and
  **Duración** (15/30/60/90/120 min, default 30).
- Submit → `createBlock`; the block appears immediately. Clicking an **occupied** cell never opens
  this modal (it opens the booking instead) and the store rejects overlapping blocks with a
  `DataError`.

## 6. Block Modal (management)

- Shows block label/date/time/duration and a `[Eliminar Bloqueo]` action (`deleteBlock`) that frees
  the slot. This is implied by block lifecycle and kept minimal.

## 7. Visual & Accessibility Rules

- Tokens only; new `--divider-subtle` used for grid lines.
- Modal labeled (`role="dialog"`, `aria-labelledby`), `Escape`/backdrop close, focus lands on the
  dialog, targets ≥ 44px.
- Status colors: `--accent-gold` (PENDING), `--accent-positive` (CONFIRMED), `--accent-negative`
  (CANCELLED/actions).