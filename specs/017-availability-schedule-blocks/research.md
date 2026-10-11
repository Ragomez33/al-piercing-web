# Phase 0 Research: Disponibilidad, Horarios Laborales y Bloqueos Avanzados

**Feature**: `017-availability-schedule-blocks` | **Date**: 2026-10-11

All unknowns from the Technical Context are resolved below as **Decision / Rationale / Alternatives**,
grounded in the current repository (patterns from features 006, 009, 011/012, 015 and 016).

---

## R1 — Range-based blocks: new table vs. altering `time_blocks`

**Decision**: Create a new table `public.availability_blocks` (range-based) in `0008_availability_blocks.sql`
and re-point the data layer at it. The existing `public.time_blocks` table (0003, fixed per-slot blocks)
is left untouched in place — no `drop`/`alter` — and the migration **copies** every existing row into an
equivalent range (`block_date` + `time_slot` → `[date · time, date · time + duration)` with
`is_full_day = false`, `reason = label`).

**Rationale**: `time_blocks` may already be live in production (0003 was applied by feature 006). A new
table is non-destructive and reversible, still honors the requirement to "expand the blocks table to
support ranges", and gives the dual adapters one homogeneous range-shaped source of truth. The data copy
preserves any already-created blocks.

**Alternatives considered**: `alter table time_blocks add column ...` + migrate rows (rejected: mutates a
possibly-live schema destructively and mixes two shapes in one table); reusing only `time_blocks` with new
columns (same rejection).

---

## R2 — Studio schedule storage

**Decision**: One row per weekday in a new `public.studio_schedule` table:
`weekday smallint` (0=Sunday … 6=Saturday, matching `Date#getDay()`), `is_open boolean not null default false`,
`open_time time` (nullable), `close_time time` (nullable). The migration seeds seven rows from the current
`DEFAULT_BUSINESS_HOURS` (Lun–Sáb 11:00–20:00, Dom closed) so the app never starts empty. RLS: public
`select`, authenticated upsert/delete.

**Rationale**: Per-weekday rows map 1:1 to the domain's `StudioScheduleDay`, are trivially upserted by the
admin editor, and mirror the existing `StructuredHours` concept in `src/lib/utils/hours.ts`. Seeding the
current default keeps demo/production behavior stable. A `CHECK (close_time > open_time)` and
`CHECK ((NOT is_open) OR (open_time IS NOT NULL AND close_time IS NOT NULL))` reject invalid configurations
at the database.

**Alternatives considered**: A single-row JSON/blob schedule (rejected: no per-field integrity, harder RLS
and updates); no seed (rejected: would instantly break the booking engine and the 015 open/closed widget).

---

## R3 — Availability engine (single pure module)

**Decision**: Add `src/lib/utils/availability.ts` with pure, framework-agnostic functions:
- `slotsInWindow(scheduleDay, stepMin): string[]` — `HH:mm` starts from `open_time` to `close_time`.
- `isSlotFree(date, slot, schedule, bookings, blocks, durationMinutes): boolean` — a slot is free when it
  is within the day's working window, does not overlap any non-cancelled booking interval
  (`[slotStart, slotStart+duration)` vs booking `[start, start+serviceDuration)`), and is not inside any
  block interval (`[start, end)` overlap) — full-day blocks cover the whole day.
- `buildFreeSlots(date, schedule, bookings, blocks, { durationMinutes, stepMin }): string[]`.
- `resolveSlotInterval(date, slot, durationMinutes)` helper that builds local `Date`s (assumption: studio
  local time == device local time, matching `localISODate`).

**Rationale**: The booking flow, the admin calendar reschedule, and an optional future 015 hook all need
the exact same intersection logic (FR-012). One pure module (like `calendar.ts`) is unit-testable,
avoids drift, and keeps data access out of components (constitution "Data Access").
`calendar.ts`'s `buildOccupancies` is adapted to the new block shape or replaced by calls into
`availability.ts` for slot computations.

**Alternatives considered**: Inlining the intersection in `BookingFlow` (rejected: duplicates the same
rules in the admin and the guard); keeping the fixed 11:00–19:30 window from `dates.ts` (rejected: the
schedule now defines the window — FR-001).

---

## R4 — Strict booking guard and the "no longer available" message

**Decision**: 
1. The public flow renders slots only through `buildFreeSlots` (schedule + bookings + blocks, FR-012/13).
2. `submitBookingRequest` (domain service) re-validates **before persisting**: it computes availability
   again for the target date/time/duration and throws `DataError("Este horario ya no se encuentra disponible")`
   when the slot became unavailable (covered by a block, out of hours, or already taken).
3. The database/duplicate-slot races keep enforcing exclusivity: the Supabase adapter maps the partial
   unique-index violation (23505) and the local adapter's existing duplicate guard to the **same**
   `"Este horario ya no se encuentra disponible"` message (was "Ese horario ya fue solicitado. Elegí otro
   horario."), so UI and data-layer messages never diverge.

**Rationale**: A race between rendering and submitting is real (two clients, or an admin block created
mid-flow). Re-validating in the domain service, plus mapping the race error, makes FR-014/FR-015 airtight
without a transaction rewrite. The shortened message is the exact copy the spec requires.

**Alternatives considered**: Silently validating only at render time (rejected: FR-014 requires the block
on submit); keeping the old duplicate-slot message (rejected: two competing messages for one condition).

---

## R5 — Time handling (studio-local)

**Decision**: Reuse the existing convention — dates travel as device-local `yyyy-mm-dd`, times as `HH:mm`
(`src/lib/utils/dates.ts`). `availability_blocks.start_datetime/end_datetime` are `timestamptz`, stored as
ISO strings carrying the local offset (a `Date` built from local date+time → `toISOString()`). The engine
always compares in that same local frame; no UTC math on the client.

**Rationale**: The whole app (bookings, admin calendar, agenda) already treats local ISO strings as the
single truth to avoid off-by-one day bugs; blocks must behave identically across visitors and admin
(spec Edge Cases: time zones/DST). This matches the spec assumption "studio local time".

**Alternatives considered**: UTC-only timestamps with an explicit studio-timezone table (rejected: new
complexity; the app has no timezone primitive anywhere today).

---

## R6 — Realtime resources for blocks, bookings and schedule

**Decision**: Extend `DataResource` in `src/lib/data/realtime.ts` with `"blocks"`, `"bookings"` and
`"schedule"`. The Supabase channel gains `postgres_changes` entries for `availability_blocks`,
`bookings` and `studio_schedule`. `store.ts` `withChangeNotifications` publishes:
- `"blocks"` after successful `createBlock` / `deleteBlock`;
- `"bookings"` after `createBooking` / `updateBookingStatus` / `updateBookingSchedule`;
- `"schedule"` after `updateSchedule`.

`BookingFlow` subscribes via `subscribeToDataChanges(["blocks", "bookings", "schedule"], …)` (debounced
refetch, keep-last-known on failure) so admin changes land on the open client page without a reload
(FR-019).

**Rationale**: The infrastructure from feature 015 already exists; adding three typed resources plus the
channel wiring is the established pattern and covers both admin→client and client→admin propagation
(appointments change from either side). Throwing mutations already publish nothing.

**Alternatives considered**: One coarse resource fired on any availability change (rejected: subscribers
would refetch on unrelated writes); polling (rejected: duplicates 015 infra, adds traffic).

---

## R7 — Admin "Horarios/Bloqueos" tab and AdminCalendar consolidation

**Decision**: Add `"schedule"` to the `AdminTab` union with a sidebar entry **Horarios** (lucide
`Clock`/`CalendarClock` icon) and `?tab=schedule` support. A new island `AdminSchedule.svelte` (mounted
under `tab === "schedule"`, consistent with `AdminCalendar`) owns:
- a **schedule editor** — seven weekday rows with an open/closed switch plus open/close time inputs,
  inline validation (`close > open`, times required when open), per-row busy state and in-place patching
  (flicker-free, feature-015 pattern);
- a **block manager** — two creation modes (time range: date + start + end; full-day range: start date +
  end date) with `motivo` (reason), end>start validation, and a list of active blocks with confirmed
  delete — all flicker-free (first-load placeholder only, per-row busy, inline errors, in-place removal);
- a **non-blocking conflict notice** when a saved block overlaps existing non-cancelled appointments
  (FR-011 — never auto-cancels).

To avoid two competing block UIs, `AdminCalendar` stops creating/managing fixed-slot blocks: its
"Nuevo bloqueo" modal and fixed-slot manage modal are removed, and block rows (now ranges) render as
read-only day info. Calendar reschedule slot lists are computed with the schedule-aware engine.

**Rationale**: The spec puts all schedule/block management in one tab; keeping the old fixed-slot creator
elsewhere would silently bypass the range model and split state. The pattern (new island + `switchTab`
wiring + flicker-free rows) is identical to 016 and 012.

**Alternatives considered**: Inlining the schedule/blocks UI into `AdminPanel.svelte` (rejected: that file
is already ~1500 lines; a sibling island mirrors `AdminCalendar` and stays testable); keeping
AdminCalendar's block modal alongside (rejected: two UIs for one model).

---

## R8 — Demo/local parity and fallbacks

**Decision**: Local adapter gains two versioned keys — `alpi:availabilityblocks:v1` (empty seed) and
`alpi:studioschedule:v1` (seed = `DEFAULT_BUSINESS_HOURS` expanded to seven `StudioScheduleDay` rows) —
with narrow guards (`isAvailabilityBlock`, `isStudioScheduleDay`). `store.ts` exports a
`listFallbackSchedule()` mirroring the existing fallbacks, used by the booking flow's schedule read.

**Rationale**: Demo and production must behave identically (FR-020); the local adapter already has typed
seeds + guards for every entity. The schedule seed means demo booking never fails closed unintentionally.

**Alternatives considered**: No schedule seed in demo (rejected: demo booking would offer zero slots and
hide the feature).

---

## R9 — Domain types and Supabase client types

**Decision**: In `src/types/domain.ts`:
- replace `TimeBlock`/`NewBlockInput` with `AvailabilityBlock { id, startDatetime, endDatetime, reason,
  isFullDay, createdAt }` and `NewAvailabilityBlockInput { startDatetime, endDatetime, reason?, isFullDay }`;
- add `StudioScheduleDay { weekday: 0|1|…|6 | Weekday-literal, isOpen, openTime: "HH:mm" | null, closeTime:
  "HH:mm" | null }` and `StudioSchedule` (the ordered seven days);
- update the `DataStore` surface: `listBlocks`, `createBlock`, `deleteBlock` (range shape),
  `getSchedule(): Promise<StudioSchedule>`, `updateSchedule(input): Promise<StudioSchedule>`;
  remove `getBookedSlots`/`getBlockedSlots` (superseded by the availability service).
And in `src/types/supabase.ts`: add `availability_blocks` and `studio_schedule` table blocks
(Row/Insert/Update, snake_case), hand-maintained exactly like prior tables (no generator wired).

**Rationale**: Every persisted entity lives in `domain.ts` and every migration is mirrored in
`supabase.ts` before UI wiring (constitution "Schema Control"); this is the established dual-adapter
contract.

**Alternatives considered**: Keeping the old `TimeBlock` type and adding range fields beside it (rejected:
two shapes for one concept invites drift).

---

## R10 — What is NOT in scope

**Decision**: No changes to `Design-system` tokens beyond documenting the new tab; no payment/money logic;
landing 015 open/closed widget keeps its static default (wiring it to `studio_schedule` is a documented
follow-up, not part of this feature); `time_blocks` table stays but is no longer read.

**Rationale**: The spec's four pillars are covered without expanding into unrelated surfaces; keeping 015
static avoids changing landed behavior not requested here.

**Alternatives considered**: Feeding the 015 landing widget from the new schedule (deferred — its UI and
copy are 015-owned; a one-line contract extension is safe to add later).

---

## R11 — Quality gates & docs

**Decision**: Gate on `npx astro check` (zero errors), `npm run build`, `npm run lint`; manual validation
in `quickstart.md`. Update `design-system.md` (admin tab documentation) and `README.md` (tabs/tables),
matching how 016 documented itself. Migration numbered `0008`.

**Rationale**: Explicit user requirement; the repository treats the type-check + build as the release gate.