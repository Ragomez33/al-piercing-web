# Research: Interactive Admin Calendar

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 0 (Outline & Research)

## 1. FullCalendar vs Custom Grid

- **Decision**: Build a **custom CSS-grid calendar** (columns = week days, rows = 30-min time bands)
  with absolutely positioned event blocks.
- **Rationale**: Zero new dependency and bundle weight (constitution "zero overhead"); complete
  control over the Dark/Gold theme; the geometry needed (time → y offset, duration → height, day →
  column) is simple deterministic math.
- **Alternatives considered**: FullCalendar (powerful but adds ~150 KB JS + its own theme layer and a
  React/Vue interop cost, overkill for one admin surface); an off-the-shelf chart library (not a
  scheduler).

## 2. Grid Geometry & Positioning

- **Decision**: Time axis 09:00–19:30 in **30-minute rows** (21 rows; the public agenda's last slot
  is 19:30). Row height 40px → `80px/hour`, `1.333px/minute`. Each day is a relative column; events
  use `top = (startMin − 540) × pxPerMinute` and `height = durationMinutes × pxPerMinute`.
- **Rationale**: Covers every bookable slot (spec Assumptions) and gives clean 30/45-minute blocks.
- **Alternatives considered**: hourly rows only (cannot show 19:30 or 45-min precision cleanly);
  a fixed total height and `%` positioning (less precise).

## 3. Appointment Duration Source

- **Decision**: Block height comes from the booking's service `durationMinutes`. Savings: bookings do
  not store a duration column; services do.
- **Rationale**: Single source of truth, no schema change to `bookings`.
- **Alternatives considered**: adding `duration_minutes` to `bookings` (unnecessary duplication).

## 4. Manual Blocks & Public Availability

- **Decision**: New `TimeBlock` entity (`id`, `date`, `timeSlot`, `durationMinutes`, `label`) stored
  in `time_blocks`. The public `BookingFlow` computes availability as
  `booked(PENDING|CONFIRMED) ∪ blocked` for the selected date.
- **Rationale**: Blocks behave exactly like active bookings for the client (they must disappear from
  the slot grid) but are a separate, admin-owned concept.
- **Alternatives considered**: reusing `bookings` with a `kind='block'` field (mixes operators and
  clients; complicates the public booking insert/RLS).

## 5. TimeBlock Persistence & RLS

- **Decision**: Demo key `alpi:timeblocks:v1`; Supabase table
  `time_blocks(id uuid, created_at, date, time_slot, duration_minutes, label)`. RLS: **anon select**
  (so the public form can hide blocked slots), **authenticated insert/update/delete** (admin only).
- **Rationale**: Public visibility is required for FR-010; mutations are admin-only (feature 005).
- **Alternatives considered**: anon can insert blocks (would let anyone block the agenda — rejected).

## 6. Rescheduling (Reagendar)

- **Decision**: `updateBookingSchedule(id, { date, timeSlot })` on the store. The modal validates the
  target against **active bookings + blocks** before calling it (exclusivity check in
  `utils/calendar.ts`).
- **Rationale**: One store method, reused later by the public flow if ever needed; the calendar owns
  the "is this slot free?" predicate.
- **Alternatives considered**: client-only optimistic move without validation (can create collisions).

## 7. Calendar Interaction Model

- **Decision**: Click an **event** → detail modal; click a **free cell** → block-create prompt (label +
  duration, default 30 min); click a **block** → block modal with delete. After any mutation, the
  week reloads from the store.
- **Rationale**: Distinguishes the three targets (booking / empty space / block) without ambiguity
  (FR-007/008/009).
- **Alternatives considered**: drag-and-drop reschedule (nice but high complexity + a11y cost for this
  iteration).

## 8. Mobile & Responsive Strategy

- **Decision**: The calendar lives in a horizontally scrollable container (`overflow-x: auto`) with a
  minimum grid width (~900px); the page itself never scrolls horizontally.
- **Rationale**: A time×day matrix cannot compress to 320px; inner scroll preserves data density and
  the spec's "no horizontal page scroll".
- **Alternatives considered**: stacked single-day cards on mobile (loses the "week at a glance" value).

## Design-Token Note

New token `--divider-subtle: rgba(255, 255, 255, 0.05)` added to `tokens.css` for the calendar grid
lines. All cards/actions reuse existing tokens (`--bg-card-light` `#1A1A1E`, `--accent-primary`
`#E5A93C`, `--accent-positive/negative/gold`, `--shadow-glow`). No raw values in components.