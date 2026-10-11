# Quickstart Validation: Disponibilidad, Horarios Laborales y Bloqueos Avanzados

**Feature**: `017-availability-schedule-blocks` | **Date**: 2026-10-11

Runnable validation for the end-to-end behavior. References the contracts/data model instead of
duplicating them. Implementation details live in `tasks.md` and the implementation phase.

## Prerequisites

- Node `>=22.12.0`, dependencies installed (`npm install`).
- Demo mode (default) needs no backend: `localStorage` seeds `alpi:availabilityblocks:v1` (empty) and
  `alpi:studioschedule:v1` (Lun–Sáb 11:00–20:00, Dom closed).
- Production mode: set `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, apply
  `supabase/migrations/0008_availability_blocks.sql` (creates both tables, seeds the schedule, copies any
  legacy `time_blocks`), and confirm Realtime is enabled on `availability_blocks`, `bookings` and
  `studio_schedule` for live cross-device updates.

## Setup & commands

```bash
npm install
npm run dev        # local site (default http://localhost:4321)
npm run check      # npx astro check — MUST pass with 0 errors
npm run build      # static build MUST succeed
npm run lint
```

## Automated gate

- `npx astro check` → **0 errors, no type discrepancies**.
- `npm run build` → succeeds; `/booking` and `/admin` are emitted; sitemap unaffected.

## Scenario 1 — Studio schedule is read from data (FR-001…FR-004)

1. In demo mode, open `/booking`; pick a service (e.g. Nostril, 30 min).
2. Confirm offered slots fall inside the seeded window (Lun a Sáb 11:00–20:00 only) and that Sunday offers
   no slots.
3. In production, verify the same from `public.studio_schedule` (seeded rows) and that unauthenticated
   reads of the table succeed (public SELECT policy).

Expected: the booking window comes from the schedule, not from a fixed constant; closed days are empty.

## Scenario 2 — Admin: configure the schedule (FR-001…FR-003, FR-017)

1. Open `/admin` (authenticated in production, or demo notice bypass only in production mode) →
   **Horarios** tab (`?tab=schedule`).
2. Toggle Sunday open and set 10:00–14:00; save → the row updates in place, no flicker, persists across
   reload.
3. Try closing a day while leaving times empty, or set close ≤ open → inline error, nothing saved.
4. Reload the tab → the saved schedule is shown.

Expected: schedule persisted; invalid input refused inline; list never blanks.

## Scenario 3 — Admin: create/delete advanced blocks (FR-005…FR-009)

1. In the **Horarios** tab, create a **time range** block: pick a date, start 13:00, end 15:00, motivo
   "Almuerzo".
2. Create a **full-day** block: start date = end date (and later a multi-day range) → both appear in the
   active list (range rows vs "Día completo" badge).
3. Try end before start → inline error, no record.
4. Delete a block (confirm dialog; cancel first, then confirm) → the row is removed in place without the
   list flickering; force an offline failure → the row stays and an inline error appears.

Expected: block lifecycle is flicker-free; invalid ranges refused; deletes are confirmed.

## Scenario 4 — Block/appointment collision warning (FR-011)

1. Create a time-range block that covers an existing non-cancelled appointment (create one in the
   Calendario tab first or via a seeded booking in a fresh demo session).
2. Confirm the block is saved **and** a non-blocking notice reports the overlap; the appointment is
   untouched.

Expected: block saved, operator warned, no silent cancellation.

## Scenario 5 — Public availability honours schedule + bookings + blocks (FR-012/13, FR-016)

1. With a schedule (Lun–Sáb 11:00–20:00), a confirmed booking at 13:00 (30 min) and a time-range block
   15:00–16:00 on the same day: open `/booking`, pick that date.
2. Confirm 13:00 is disabled (booked), 15:00 and 15:30 are disabled (blocked), and the rest of the window
   is offered.
3. Add a full-day block for a date → that date offers zero slots with a clear empty state.
4. Cancel the 13:00 booking in the admin → 13:00 is offered again (after live refresh, Scenario 6).

Expected: slots come from the three-way intersection, never from stale/fixed data.

## Scenario 6 — Attempting a now-unavailable slot is refused (FR-014/FR-015)

1. Open `/booking` on a date; leave a free slot selected and the form filled.
2. In another tab/admin, block that exact slot (or book it), or edit the schedule to close the window.
3. Submit the original form → the action is blocked, no appointment is created, and
   "Este horario ya no se encuentra disponible" is shown.
4. Also confirm the duplicate message from a double-submit uses the same copy.

Expected: no booking into a slot that became unavailable; the exact required message appears.

## Scenario 7 — Realtime sync admin ↔ client (FR-019)

1. Open `/booking` on a date in tab A and the **Horarios** tab (or Calendario tab) in tab B.
2. In tab B: create a block covering an offered time → tab A removes those times within ~5 s **without a
   reload**; delete the block → times return.
3. In tab B: approve/cancel a booking → tab A reflects the change (slot freed) without a reload.
4. Change the schedule in tab B → tab A's window updates without a reload.
5. Simulate an unavailable transport (offline/devtools) → tab A keeps the last known availability and the
   focus-refresh fallback still updates when the tab is revisited.

Expected: blocks, bookings and schedule changes propagate live; degradation is non-blocking.

## Scenario 8 — Regression & gates

1. Run `npm run check`, `npm run build`, `npm run lint`.
2. Spot-check `/booking` (success flow), `/catalog`, `/`, `/landing-v2` and the admin Calendario tab
   (booking approve/cancel/reschedule still work; the legacy fixed-slot block modal is gone).
3. Confirm `src/` has no remaining reads of `time_blocks` (only the copy inside the 0008 migration and the
   legacy table definition in 0003) and that `getBlockedSlots`/`getBookedSlots` are gone from the data
   layer (superseded by the availability service).

Expected: unrelated routes unchanged; all gates pass; legacy block UI fully replaced by the Horarios tab.