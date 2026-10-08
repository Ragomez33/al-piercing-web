---

description: "Task list for Interactive Admin Calendar feature implementation"
---

# Tasks: Interactive Admin Calendar

**Input**: Design documents from `/specs/006-admin-calendar/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is done
through `quickstart.md` scenarios S1–S10 plus `astro check` / `npm run build` gates (final polish
phase).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro project)
- Types/store → `src/lib/types/domain.ts`, `src/lib/data/`; utils → `src/lib/utils/`; admin UI →
  `src/components/admin/`; booking → `src/components/booking/BookingFlow.svelte`;
  migration → `supabase/migrations/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and target directories

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0
- [x] T002 [P] Ensure directories exist: `src/lib/utils/` and `supabase/migrations/` (both already scaffolded)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Token, calendar math, TimeBlock storage (demo + prod) and schedule-update API — MUST be
complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `--divider-subtle: rgba(255, 255, 255, 0.05)` to src/styles/tokens.css (Design Parity;
  used by the calendar grid lines, FR-012)
- [x] T004 Extend src/lib/types/domain.ts per `contracts/calendar-data-contract.md` — `TimeBlock` (`id` REQUIRED unique; `date` local ISO `yyyy-mm-dd`; `timeSlot` `HH:mm`; `durationMinutes` one of 15/30/60/90/120; `label` REQUIRED non-empty), `NewBlockInput`, `SchedulePatch { date; timeSlot }`; extend `DataStore` with `listBlocks({ date? })`, `createBlock(input)`, `deleteBlock(id)`, `updateBookingSchedule(id, patch)`, `getBlockedSlots(date)`
- [x] T005 [P] Create src/lib/utils/calendar.ts — week-range helper (Monday–Sunday, prev/next), minute math (`startMin − 540`), px geometry (40px/30 min → 1.333 px/min), availability predicate (`unavailable = booked ∪ blocked`), `HH:mm` formatting, per research §2/§7
- [x] T006 Create supabase/migrations/0003_time_blocks.sql — `time_blocks(id, created_at, date, time_slot, duration_minutes CHECK in (15,30,60,90,120), label)` + RLS per contract §4: select PUBLIC (so the public form hides blocked slots), insert/update/delete AUTHENTICATED only
- [x] T007 [P] Edit src/lib/data/adapters/local.ts — demo `time_blocks` (key `alpi:timeblocks:v1`, seed `[]`, full-array writes, `isTimeBlock` narrowing) implementing `listBlocks/createBlock/deleteBlock/getBlockedSlots`, plus `updateBookingSchedule` (maps `date`/`timeSlot` on the booking, status unchanged)
- [x] T008 [P] Edit src/lib/data/adapters/supabase.ts — same TimeBlock API against `time_blocks` and `updateBookingSchedule` against `bookings` via the shared client; rows narrowed; errors as typed `DataError` (contract §4)

**Checkpoint**: Foundation ready — token, calendar utils, storage and schedule API complete

---

## Phase 3: User Story 1 - Operator reads the week at a glance (Priority: P1) 🎯 MVP

**Goal**: The admin's default agenda view becomes the interactive weekly calendar with correctly
sized, styled appointment blocks.

**Independent Test**: Sign in, open `/admin` (default calendar) → Mon–Sun columns and 09:00–19:30
axis; bookings appear positioned/sized and colored per status (quickstart S1/S2).

### Implementation for User Story 1

- [x] T009 [US1] Create src/components/admin/AdminCalendar.svelte — weekly grid composed inside the `AdminPanel` island (no `client:`): day headers (Mon–Sun), 30-min rows 09:00–19:30 with `--divider-subtle` grid lines, hours label column, prev/next week pager, loads bookings + blocks via `dataStore.listBookings()` + `dataStore.listBlocks()` for the week (FR-001/002)
- [x] T010 [US1] Render appointment blocks in src/components/admin/AdminCalendar.svelte — absolute position via `top = (startMin − 540) × 1.333`, `height = durationMinutes × 1.333` (duration from the service); `CONFIRMED` solid `--bg-card-light` + gold border `--accent-primary` + `--shadow-glow`, `PENDING` translucent card; label `HH:mm – Client (Service)` (FR-003/004/005)
- [x] T011 [US1] Rework src/components/admin/AdminPanel.svelte — tabs become **Calendario** (default, `?tab=calendar`) and **Inventario** (`?tab=catalog`); REMOVE the flat bookings list; mount `<AdminCalendar />` under the calendar tab (FR-001)

**Checkpoint**: At this point, User Story 1 is fully functional — interactive weekly calendar (MVP)

---

## Phase 4: User Story 2 - Open an appointment and act on it (Priority: P2)

**Goal**: Clicking a booking block opens a detail dialog with the full financial data and quick
actions that mutate the booking and refresh the calendar.

**Independent Test**: Click a booking → modal with WhatsApp, service, total, seña and saldo;
`[Confirmar Seña]`, `[Reagendar]` to a free slot and `[Cancelar Cita]` each work and update the grid
(quickstart S3/S4).

### Implementation for User Story 2

- [x] T012 [US2] Add the booking detail modal in src/components/admin/AdminCalendar.svelte — WhatsApp/contact, service name, date/time, `Precio total` (formatCents), `Seña (50%)`, `Saldo en el local` (`total − seña`, integer cents), status badge (FR-006)
- [x] T013 [US2] Add modal actions in src/components/admin/AdminCalendar.svelte — `[Confirmar Seña]` → `dataStore.updateBookingStatus(id, "CONFIRMED")` only while `PENDING`; `[Cancelar Cita]` → `"CANCELLED"` only while not cancelled; `[Reagendar]` → date input + free-slot pills (targets occupied by another active booking or a block are disabled) → `dataStore.updateBookingSchedule(id, { date, timeSlot })`; each action reloads the week and surfaces `DataError` inline (FR-007/009)

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Manual time blocking (Priority: P3)

**Goal**: The operator can block free cells with a label/duration, manage blocks, and blocked times
disappear from the public booking screen.

**Independent Test**: Click a free cell → create "Almuerzo"/30 min; the block appears and the same
time is disabled on the public booking form; deleting the block frees it (quickstart S5/S6).

### Implementation for User Story 3

- [x] T014 [US3] Add block creation to src/components/admin/AdminCalendar.svelte — clicking a FREE cell opens a modal prefilled with that date/time: `Etiqueta` (select incl. "Almuerzo", "Personal", "Mantenimiento" + custom) and `Duración` (15/30/60/90/120, default 30) → `dataStore.createBlock`; clicking an occupied cell opens the booking modal instead; overlapping blocks rejected with `DataError` (FR-008/009)
- [x] T015 [US3] Add block management modal with `[Eliminar Bloqueo]` → `dataStore.deleteBlock(id)` (slot freed) in src/components/admin/AdminCalendar.svelte; update src/components/booking/BookingFlow.svelte so public availability = `getBookedSlots(date) ∪ getBlockedSlots(date)` (blocked times disabled) (FR-010)

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T016 [P] a11y/responsive pass — modal `role="dialog"` + `aria-labelledby`, `Escape`/backdrop close, focus management, targets ≥ 44px; calendar scrolls horizontally inside its container at 320px with NO page horizontal scroll (FR-012/SC-004)
- [x] T017 [P] Token pass — grep `src/` for raw hex/rgba: only `src/styles/tokens.css` may contain literals (quickstart S10)
- [x] T018 [P] Island/performance audit — `AdminCalendar` is composed inside the existing `AdminPanel` island (no new `client:`); only `AdminPanel`, `BookingFlow`, `CatalogGrid`, `CartDrawer` + canvas hydrate (principle I)
- [x] T019 [P] Update docs — README.md and design-system.md admin module to describe the calendar tab (and note the flat list is replaced)
- [x] T020 Run final validation against quickstart.md S1–S10 plus `npx astro check` and `npm run build` at repository root — all MUST pass with zero errors and zero warnings (FR-013/SC-005)
- [x] T021 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — creates `AdminCalendar.svelte` + tabs
- **US2 (P2)**: After US1 — extends the same `AdminCalendar.svelte` file, sequential
- **US3 (P3)**: After US2 — same file (blocks) + `BookingFlow.svelte` (availability)

### Within Each User Story

- `AdminCalendar.svelte` is shared by US1 (T009/T010), US2 (T012/T013) and US3 (T014) — strictly
  sequential
- `BookingFlow.svelte` (T015) is separate and parallel-safe after Foundational

### Parallel Opportunities

- Setup T002; Foundational T005/T006/T007/T008; Polish T016–T019 can run in parallel (different files)
- Do NOT parallelize tasks editing `AdminCalendar.svelte` (T009 → T010 → T012 → T013 → T014)

---

## Parallel Example: Foundational

```bash
# After Phase 1:
Task: "Create src/lib/utils/calendar.ts"                      # T005
Task: "Create supabase/migrations/0003_time_blocks.sql"       # T006
Task: "Edit src/lib/data/adapters/local.ts (time_blocks)"    # T007
Task: "Edit src/lib/data/adapters/supabase.ts (time_blocks)" # T008
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (weekly grid + cards)
4. **STOP and VALIDATE**: quickstart S1/S2; `astro check` + `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → calendar math + storage ready
2. Add US1 → test S1/S2 → demo (MVP!)
3. Add US2 → test S3/S4 → demo
4. Add US3 → test S5/S6 → demo
5. Polish → S7–S10 + gates

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: Developer A owns US1 → US2 → US3 (`AdminCalendar.svelte` sequential);
   Developer B owns the `BookingFlow` availability change (T015) + polish
3. Stories remain independently testable via quickstart S1–S6

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Each user story is independently completable and testable (quickstart S1–S6)
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Contract constraints (`durationMinutes` ∈ {15,30,60,90,120}, card rules, availability union,
  RLS of `time_blocks`) are quoted verbatim and MUST NOT change at implementation time
- The calendar REPLACES the flat bookings list; `AdminCalendar` stays inside the `AdminPanel` island
  (no new hydration)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently