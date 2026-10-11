---

description: "Task list for the robust availability/schedule/blocks feature implementation"
---

# Tasks: Disponibilidad, Horarios Laborales y Bloqueos Avanzados

**Input**: Design documents from `specs/017-availability-schedule-blocks/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks are generated — the feature spec does not request a test suite; the quality gates are `npx astro check` (0 errors) and `npm run build` (tasks T001/T026), plus the manual scenarios in `quickstart.md` (T027).

**Organization**: Tasks are grouped by user story (US1–US4, from spec.md) so each story is independently implementable and testable. The data layer + availability engine are Foundational because every story consumes them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 … US4)
- Exact file paths are included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the repository baseline before any change (no project scaffolding needed — existing Astro/Svelte repo).

- [X] T001 Run the baseline gates on the current tree in the repository root: `npx astro check` (expect 0 errors) and `npm run build` (expect success), and record the results in the feature notes for comparison against T026.

**Checkpoint**: Baseline is clean; all feature work starts from a known-good tree.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model, adapters, realtime and the availability engine — the shared surface that MUST exist before ANY user story UI can compile and behave correctly.

> **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create the migration `supabase/migrations/0008_availability_blocks.sql` per `contracts/availability-data-contract.md` §3: `public.availability_blocks` (`id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, `start_datetime timestamptz not null`, `end_datetime timestamptz not null`, `reason text not null default ''`, `is_full_day boolean not null default false`, `constraint availability_blocks_range_positive check (end_datetime > start_datetime)`); `public.studio_schedule` (`weekday smallint primary key check (weekday between 0 and 6)`, `is_open boolean not null default false`, `open_time time`, `close_time time`, `constraint studio_schedule_hours_consistent check ((not is_open) or (open_time is not null and close_time is not null and close_time > open_time))`); `enable row level security` on both; RLS policies (public `for select using (true)` on both; `insert/update/delete` `to authenticated` on both); seed the seven schedule rows `(1..6 → true, '11:00','20:00'; 0 → false, null, null)`; copy legacy `public.time_blocks` rows into `availability_blocks` as same-day ranges (`(block_date::timestamp + time_slot::time)::timestamptz` → start, `+ duration_minutes` interval → end, `label` → reason, `is_full_day false`); explicit `grant all on public.availability_blocks, public.studio_schedule to anon, authenticated, service_role;`. Do NOT drop or alter `time_blocks`.
- [X] T003 Add the new domain types in `src/types/domain.ts`: `Weekday` (`"sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat"`), `AvailabilityBlock` (`id`, `startDatetime`, `endDatetime`, `reason`, `isFullDay`, `createdAt` — quote data-model.md §1: "endDatetime must be strictly after startDatetime (DB CHECK + adapter validation)", `isFullDay` defaults false), `NewAvailabilityBlockInput` (`startDatetime`, `endDatetime`, `reason?`, `isFullDay?`), `StudioScheduleDay` (`weekday`, `isOpen`, `openTime: string | null`, `closeTime: string | null` — quote data-model.md §3: "openTime/closeTime required (non-null) when isOpen === true", "closeTime must be strictly after openTime"), `StudioSchedule` (the ordered seven days), `UpdateScheduleDayInput` (`isOpen`, `openTime: string | null`, `closeTime: string | null`).
- [X] T004 Update the `DataStore` interface in `src/types/domain.ts` per data-model.md §4: `listBlocks(input?: { date?: string }): Promise<AvailabilityBlock[]>`, `createBlock(input: NewAvailabilityBlockInput): Promise<AvailabilityBlock>`, `deleteBlock(id: string): Promise<void>`, `getSchedule(): Promise<StudioSchedule>`, `updateScheduleDay(weekday: Weekday, patch: UpdateScheduleDayInput): Promise<StudioSchedule>`; **remove** `TimeBlock`, `NewBlockInput`, `getBookedSlots` and `getBlockedSlots` from the file entirely (superseded by the availability service).
- [X] T005 [P] Add the `availability_blocks` and `studio_schedule` table blocks (Row/Insert/Update + `Relationships: []`) to `src/types/supabase.ts`, hand-maintained, snake_case (`start_datetime`, `end_datetime`, `reason`, `is_full_day`, `weekday`, `is_open`, `open_time`, `close_time`), styled exactly like `team_members`/`gallery_items`.
- [X] T006 Create `src/lib/data/schedule.ts` exporting `DEFAULT_SCHEDULE_SEED: StudioScheduleDay[]` (research R8): seven rows in stable order `sun..sat`; `mon..sat` → `isOpen: true, openTime: "11:00", closeTime: "20:00"`; `sun` → `isOpen: false, openTime: null, closeTime: null`.
- [X] T007 [P] Rework `src/lib/data/adapters/supabase.ts`: delete `TimeBlock`/`TimeBlockRow`/`toTimeBlock` and the `time_blocks` queries; add `toAvailabilityBlock` (maps `start_datetime → startDatetime`, `end_datetime → endDatetime`, `reason`, `is_full_day → isFullDay`, `created_at → createdAt`) and `toStudioScheduleDay` (maps `weekday` 0=Sunday…6=Saturday → `Weekday`, `is_open`, `open_time`, `close_time`); implement `listBlocks` (optional `date` filter = blocks whose `[start,end)` interval covers any part of the local day), `createBlock` (validate `end > start` → `DataError("El fin debe ser posterior al inicio")`), `deleteBlock`, `getSchedule` (`studio_schedule` ordered by `weekday`, missing days normalized to closed), `updateScheduleDay` (validate open days have times and `close > open` → `DataError("El cierre debe ser posterior a la apertura")` / `DataError("Completá la hora de cierre")`; `.upsert` the row; return the full refreshed schedule); **remove** `getBookedSlots`/`getBlockedSlots`; map Postgres error `23505` → `DataError("Este horario ya no se encuentra disponible")` in `toDataError`.
- [X] T008 [P] Rework `src/lib/data/adapters/local.ts`: remove `TimeBlock`/`NewBlockInput`/`isTimeBlock`/`BLOCKS_KEY` logic; add keys `alpi:availabilityblocks:v1` and `alpi:studioschedule:v1`; guards `isAvailabilityBlock` (narrows `id`, `startDatetime`, `endDatetime`, `reason`, `isFullDay`, `createdAt`) and `isStudioScheduleDay`; seeds blocks `[]` and schedule from `DEFAULT_SCHEDULE_SEED`; implement the same `DataStore` surface as T007 with identical validation messages, **removing** `getBookedSlots`/`getBlockedSlots`; change the duplicate-active-slot guard message in `createBooking` from the old copy to `DataError("Este horario ya no se encuentra disponible")`.
- [X] T009 Extend `src/lib/data/realtime.ts`: `DataResource` gains `"blocks" | "bookings" | "schedule"`; add to `RESOURCES` and the Supabase channel `.on("postgres_changes", …)` entries for tables `availability_blocks` → `"blocks"`, `bookings` → `"bookings"`, `studio_schedule` → `"schedule"`. BroadcastChannel/storage transports and the focus fallback stay unchanged.
- [X] T010 Update `src/lib/data/store.ts` `withChangeNotifications`: publish `"blocks"` after successful `createBlock`/`deleteBlock`, `"bookings"` after successful `createBooking`/`updateBookingStatus`/`updateBookingSchedule`, `"schedule"` after successful `updateScheduleDay` (throwing mutations publish nothing); export `listFallbackSchedule(): Promise<StudioSchedule>` mirroring `listFallbackServices`/`listFallbackGalleryItems` using `createLocalAdapter().getSchedule()`.
- [X] T011 Create the pure engine `src/lib/utils/availability.ts` per `contracts/booking-availability-contract.md` §1 (framework-agnostic, mirroring `calendar.ts` style): `resolveSlotInterval(date, slot, durationMinutes): { start: Date; end: Date }` (local Dates from local date + `HH:mm`); `isSlotFree(date, slot, durationMinutes, scheduleDay: StudioScheduleDay | null, bookings: {date; timeSlot; status; durationMinutes}[], blocks: AvailabilityBlock[]): boolean` — **free ⇔ `(scheduleDay?.isOpen && openTime ≤ slot && slot+duration ≤ closeTime)`** AND no non-cancelled booking interval `[t, t+dur)` overlaps `[slot, slot+dur)` AND no block interval overlaps `[slot, slot+dur)` (full-day blocks cover the whole local day); `buildFreeSlots(date, scheduleDay, bookings, blocks, options?: { durationMinutes?: number; stepMin?: number }): string[]` — ordered `HH:mm` starts from `openTime` for `(closeTime - openTime)` in 30-min steps that pass `isSlotFree`, returning `[]` for closed/no-schedule days and `[]` when a block covers the whole day.
- [X] T012 Create the domain service `src/lib/services/availability.ts` per `contracts/booking-availability-contract.md` §2: `interface DayAvailability { date: string; slots: string[]; hasSchedule: boolean; closedReason: "closed" | "blocked" | null }` and `getDayAvailability(date: string, durationMinutes?: number): Promise<DayAvailability>` — orchestrates `dataStore.getSchedule()`, `dataStore.listBookings({ date })`, `dataStore.listBlocks({ date })` and an id→durationMinutes map from `dataStore.listServices()` (the existing AdminCalendar pattern), then returns `buildFreeSlots(...)`; on a schedule read failure use `listFallbackSchedule()`; components never call `dataStore`/the engine directly for this computation.

**Checkpoint**: Foundation ready — both adapters, the store, realtime and the engine all compile against the new surface; `npx astro check` and `npm run build` pass (run them here, before starting stories). User story implementation can now begin.

---

## Phase 3: User Story 1 - Configure la semana laboral y el horario de atención (Priority: P1)

**Goal**: The operator edits the studio's weekly working pattern (weekdays open/closed + open/close times) from a new admin tab.

**Independent Test**: In production mode (authenticated), open `/admin?tab=schedule`, toggle a weekday and change its open/close times, save → the row updates in place with no flicker and persists across reload; invalid input (close ≤ open, or an open day without times) → inline `DataError`, nothing saved; reloading the tab shows the saved schedule. (quickstart.md Scenario 2.)

### Implementation for User Story 1

- [X] T013 [US1] Create `src/components/admin/AdminSchedule.svelte` as a Svelte 5 island; render the **weekly schedule editor section** per `contracts/admin-schedule-ui-contract.md` §2.1: seven weekday rows (Lun→Dom) each with an open/closed `role="switch"` (`aria-checked`), two `<input type="time">` bound to `openTime`/`closeTime` enabled only while open, and a per-row busy state; validate before save (open day without times → `DataError("Completá la hora de apertura y cierre")`; `close <= open` → `DataError("El cierre debe ser posterior a la apertura")`); persist via `dataStore.updateScheduleDay(weekday, patch)` and patch the local schedule array in place from the returned `StudioSchedule`; flicker-free list state `{ loaded, loading, error }` (placeholder only while `loaded === false`); token-driven scoped styling, ≥44×44px controls, `prefers-reduced-motion` disables transitions (the block-manager section is added in US2 — leave a clearly marked placeholder region).
- [X] T014 [US1] Wire the tab in `src/components/admin/AdminPanel.svelte`: add `"schedule"` to the `AdminTab` union; add a **Horarios** sidebar entry (lucide `Clock` icon) between Calendario and Inventario; `switchTab("schedule")` triggers a refresh handler and `?tab=schedule` is parsed in `onMount`; the sign-out reset clears schedule/block state; render `<AdminSchedule />` under `tab === "schedule"` (import it like `AdminCalendar`).
- [X] T015 [US1] Adapt `src/components/admin/AdminCalendar.svelte` per `contracts/admin-schedule-ui-contract.md` §4: replace the `TimeBlock` import/state with `AvailabilityBlock`; **remove** the fixed-slot "Nuevo bloqueo" modal, the manage/delete modal and the `nb*`/`managing` state; render blocks in the day list as **read-only** rows built from `dataStore.listBlocks()` showing a range label (or "Día completo") + reason, with a hint pointing to the Horarios tab; keep the monthly grid, booking list and approve/confirm/cancel flows unchanged.

**Checkpoint**: At this point, User Story 1 is fully functional — the schedule can be configured, validated and persisted, and the calendar compiles with range-based blocks.

---

## Phase 4: User Story 2 - Crear y gestionar bloqueos avanzados (Priority: P1)

**Goal**: The operator creates time-range and full-day-range blocks and manages the active block list, flicker-free.

**Independent Test**: In the Horarios tab, create a time-range block (date + start + end) and a full-day block (start date = end date, and a multi-day range); both appear in the active list; end-before-start is refused inline (`DataError("El fin debe ser posterior al inicio")`); delete (cancel keeps it, confirm removes it) updates the list in place without flicker; a block overlapping an existing non-cancelled appointment is saved WITH a non-blocking collision notice and the appointment is untouched. (quickstart.md Scenarios 3–4.)

### Implementation for User Story 2

- [X] T016 [US2] Add the **block creation** section to `src/components/admin/AdminSchedule.svelte` (replacing the US1 placeholder) per `contracts/admin-schedule-ui-contract.md` §2.2: a mode selector (Rango de horas: `date` + start `time` + end `time` → `NewAvailabilityBlockInput` with `isFullDay: false`, local-offset ISO `startDatetime`/`endDatetime`; Días completos: start `date` + end `date` → `isFullDay: true`) plus a Motivo text input; validate end strictly after start → `DataError("El fin debe ser posterior al inicio")`; persist via `dataStore.createBlock` and append the returned block in place; after a successful save, check the saved block against `dataStore.listBookings()` and, when it overlaps any non-cancelled appointment, show a non-blocking inline `collisionNotice` (never auto-cancel).
- [X] T017 [US2] Add the active **block list + delete** to `src/components/admin/AdminSchedule.svelte` per `contracts/admin-schedule-ui-contract.md` §2.3: render every block as a row (time-range label or "Día completo" badge + reason), a delete action behind a confirmation dialog (`role="alertdialog"`), deletion via `dataStore.deleteBlock` patching the list in place with per-row busy state (`class:busy` + `aria-busy`, row disabled while in flight); failures keep the previous list and show an inline error; long `reason` wraps with `overflow-wrap: anywhere`.

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — the admin owns the full schedule + block surface.

---

## Phase 5: User Story 3 - Solo los horarios realmente libres pueden reservarse (Priority: P1)

**Goal**: The public booking engine offers only times that are within working hours, not already booked, and not covered by any block; submitting an unavailable time is refused with "Este horario ya no se encuentra disponible".

**Independent Test**: With a schedule (Lun–Sáb 11:00–20:00), a confirmed 13:00 booking (30 min) and a 15:00–16:00 block on one day, open `/booking` → 13:00 disabled (booked), 15:00/15:30 disabled (blocked), rest offered; a full-day block date offers 0 slots; cancelling the booking frees 13:00; attempting to submit a slot that became unavailable (block added or booked elsewhere between render and submit) creates no appointment and shows the exact message. (quickstart.md Scenarios 1, 5, 6.)

### Implementation for User Story 3

- [X] T018 [US3] Rework `src/components/booking/BookingFlow.svelte` to compute availability through the domain service: replace the `getBookedSlots`/`getBlockedSlots` calls with `getDayAvailability(date, selected.durationMinutes)` (per `contracts/booking-availability-contract.md` §4); unavailable times = slots NOT returned by the engine → render `disabled` (drop the now-obsolete `bookedSlots.includes` logic origin); show the existing-style empty state when the day offers no slots (closed day / full-day block / no schedule); on a read failure keep the last known availability and show a non-blocking notice.
- [X] T019 [US3] Add the strict submit guard in `src/lib/services/booking.ts` per `contracts/booking-availability-contract.md` §3: in `submitBookingRequest`, before persisting, resolve the day's schedule/bookings/blocks and build the interval `[date · timeSlot, + service.durationMinutes)`; when `!isSlotFree(...)` throw `DataError("Este horario ya no se encuentra disponible")`; the persistent race remains enforced by the DB unique index / local duplicate guard which now map to the **same** exact message (T007/T008); confirm `approveBooking`/`cancelBooking`/`updateBookingSchedule` behavior is unchanged.
- [X] T020 [US3] In `src/components/admin/AdminCalendar.svelte`, compute the reschedule slot list with `getDayAvailability(date, durationFor(selected.serviceId))` (excluding the booking being moved, mirroring today's `excludeId`) instead of the fixed `calendarRows()`/`buildOccupancies` path, so reschedule honours working hours and range blocks.
- [X] T021 [US3] Update `src/lib/utils/calendar.ts` so it no longer references the removed block shape: adapt (or retire) `buildOccupancies` to accept the availability interval engine result range blocks; keep `calendarRows`/`dayStatusSummary`/month-grid helpers unchanged unless they become unused by T020 — if unused after T020, remove them and their imports to keep `src/` clean.

**Checkpoint**: At this point, User Stories 1–3 work together — offered slots are the strict 3-way intersection and unavailable submissions are blocked.

---

## Phase 6: User Story 4 - Disponibilidad en vivo sin recargar (Priority: P2)

**Goal**: Changes made by the operator (blocks, schedule) and appointment changes propagate to an open public booking page without a manual reload.

**Independent Test**: Open `/booking` on a date in tab A and the Horarios/Calendario tab in tab B; in tab B create a block covering an offered time → tab A removes those times within ~5 s without a reload/scroll jump; delete the block → times return; approve/cancel a booking or edit the schedule in tab B → tab A reflects it; with transport unavailable, tab A keeps the last known availability and the focus-refresh fallback still works. (quickstart.md Scenario 7.)

### Implementation for User Story 4

- [X] T022 [US4] Subscribe the public flow in `src/components/booking/BookingFlow.svelte` per `contracts/booking-availability-contract.md` §4: on mount, `subscribeToDataChanges(["blocks", "bookings", "schedule"], handler)`; the handler debounces (~250 ms) and refetches `getDayAvailability(date, durationMinutes)` for the currently selected date, patching `bookedSlots`/the offered set in place with no reload and no scroll jump; a failed refetch keeps the last known availability; unsubscribe in `onDestroy` (import the unsubscribe function pattern used elsewhere).
- [X] T023 [US4] Add live cross-tab refresh to `src/components/admin/AdminSchedule.svelte`: subscribe to `subscribeToDataChanges(["blocks", "schedule"], handler)` and refresh the block list + schedule state in place when events arrive from another tab/device (idempotent — same-tab mutations already patch from return values), keeping the flicker-free guarantees.

**Checkpoint**: All user stories are independently functional; public bookings live-sync with admin changes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final gates and cleanup across the feature.

- [X] T024 [P] Document the module in `design-system.md` (admin Horarios/Bloqueos tab, range-block visual language, switch/time-input patterns) following the existing admin-module sections.
- [X] T025 [P] Update `README.md` (route/tab/table inventory: `availability_blocks`, `studio_schedule`, migration 0008, `?tab=schedule`).
- [X] T026 Run the final gates in the repository root: `npx astro check` (0 errors), `npm run build` (succeeds), `npm run lint` (passes); fix any introduced failures.
- [X] T027 Execute every scenario in `specs/017-availability-schedule-blocks/quickstart.md` (1–8) and fix any defects found (only within this feature's touched surface).
- [X] T028 Sweep for stale references: confirm `src/` no longer references `TimeBlock`, `NewBlockInput`, `getBookedSlots`, `getBlockedSlots`, or reads the `time_blocks` table (allowed references: the legacy table definition in `supabase/migrations/0003_time_blocks.sql` and the copy step inside `0008_availability_blocks.sql`); also confirm no remaining consumer of the old fixed-slot block UI.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — runs first.
- **Foundational (Phase 2)**: Depends on Setup; **BLOCKS all user stories** (every story consumes the new `DataStore` surface, adapters and the availability engine).
- **User Stories (Phase 3+)**:
  - US1 depends on Foundational.
  - US2 depends on US1 (`AdminSchedule.svelte` is created in US1, extended in US2).
  - US3 depends on Foundational (engine/service) and pairs with US1/US2 for the full public reflection.
  - US4 depends on Foundational (realtime resources) + US3 (`BookingFlow` must already use `getDayAvailability`).
- **Polish (Final Phase)**: Depends on all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependencies on other stories.
- **User Story 2 (P1)**: After US1 (same island) — independently testable once US1's island exists.
- **User Story 3 (P1)**: After Foundational — merges with US1/US2 for the full user flow but is independently testable with seeded schedule/blocks/bookings.
- **User Story 4 (P2)**: After US3 — final live-sync increment.

### Within Each User Story

- Core implementation in dependency order (island shell → UI → actions → integration).
- No unit-test phase (not requested); verify behavior via the story's Independent Test and quickstart scenarios.

### Parallel Opportunities

- Foundational: T005, T007, T008 and T009 touch **different files** and can run in parallel after T003/T004 (types) exist.
- Within US1: T013/T014/T015 touch different files but T013 (island) should exist before T014 (wiring) compiles cleanly.
- US2 edits only `AdminSchedule.svelte` → strictly sequential.
- Polish: T024 and T025 are independent (different docs) and can run in parallel.

### Parallel Example: US3 (files are disjoint)

```bash
# All US3 tasks touch different files — can be launched together after Foundational:
Task: "Rework BookingFlow availability (src/components/booking/BookingFlow.svelte)"
Task: "Strict submit guard in src/lib/services/booking.ts"
Task: "AdminCalendar reschedule via engine (src/components/admin/AdminCalendar.svelte)"
Task: "calendar.ts buildOccupancies adaptation (src/lib/utils/calendar.ts)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline gates).
2. Complete Phase 2: Foundational (data layer + engine — CRITICAL, blocks everything).
3. Complete Phase 3: User Story 1 (weekly schedule editor + tab).
4. **STOP and VALIDATE**: run `npx astro check`/`npm run build` and US1's Independent Test (quickstart Scenario 2).
5. (Recommended next slice: US3 — it delivers the strict public availability value.)

### Incremental Delivery

1. Setup + Foundational → Foundation ready (gate).
2. Add User Story 1 → test independently → deploy/demo (MVP: schedule management).
3. Add User Story 2 → test independently → demo (full admin block/schedule surface).
4. Add User Story 3 → test independently → demo (strict public availability + guard).
5. Add User Story 4 → test independently → demo (live sync).
6. Polish (docs + final gates + quickstart sweep).

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: US1 (then US2 — same island).
   - Developer B: US3 (BookingFlow + guard + calendar utils) — disjoint files from US1/US2.
3. After US3: Developer B or A takes US4.
4. Stories integrate independently; gates run at every checkpoint.

---

## Notes

- [P] tasks = different files, no dependencies; same-file tasks (US2's two tasks, US1's island→wiring) stay sequential.
- [Story] label maps tasks to the spec's user stories (US1…US4) for traceability.
- Every story has an Independent Test (above) and maps to quickstart.md scenarios (US1→2, US2→3–4, US3→1/5/6, US4→7).
- The exact user-required copy "Este horario ya no se encuentra disponible" must appear verbatim in T019's guard, T007's 23505 mapping and T008's local duplicate guard.
- Contract constraints are quoted verbatim in the task bodies (migration checks, validation messages, time rules) so implementation needs no discretion.
- Commit after each task or logical group; run gates at each checkpoint; never drop or alter the legacy `time_blocks` table.