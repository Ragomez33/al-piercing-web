---

description: "Task list for Booking Request Persistence & Admin Approval feature implementation"
---

# Tasks: Booking Request Persistence & Admin Approval

**Input**: Design documents from `/specs/009-booking-request-approval/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is done through
`quickstart.md` scenarios S1–S9 plus the `astro check` / `npm run build` / `npm run lint` gates in the
final polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of
each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro project)
- Domain service → `src/lib/services/`; utils → `src/lib/utils/`; types → `src/lib/types/domain.ts`;
  adapters → `src/lib/data/adapters/`; public booking UI → `src/components/booking/`;
  admin UI → `src/components/admin/`; migration → `supabase/migrations/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and confirm target paths

- [X] T001 Verify baseline: run `npm run check` (`astro check`), `npm run build` and `npm run lint` at repository root; all MUST exit 0 before changes
- [X] T002 [P] Confirm target scaffolding: `supabase/migrations/` latest is `0005_*.sql` (next is `0006`); create the new directory `src/lib/services/`; confirm `src/lib/utils/booking.ts`, `src/components/booking/BookingFlow.svelte` and `src/components/admin/AdminCalendar.svelte` exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: WhatsApp link builders, the domain service, the DB constraint migration and adapter parity —
MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend `src/lib/utils/booking.ts` with two pure link builders consumed by the service: `buildBookingNoticeLink(booking, phone)` producing a post-submit notice beginning "Hola, acabo de solicitar una reserva…" with service + date/time, and `buildBookingConfirmationLink(booking, phone)` producing a studio confirmation with service + date/time; both MUST return `null` when `phone` is not digits-only (`/^[0-9]+$/`) and MUST preserve accents via `encodeURIComponent`; keep the existing builder or refactor it without breaking callers (research R5, FR-004/FR-011/FR-015)
- [X] T004 Create `src/lib/services/booking.ts` — the domain service boundary (constitution §IV, §2.3). Export typed `SubmitBookingResult { booking: Booking; noticeUrl: string | null }` and `ApprovalResult { booking: Booking; confirmationUrl: string | null }`, plus `submitBookingRequest(input: NewBookingInput, phone: string): Promise<SubmitBookingResult>`, `approveBooking(id: string, phone: string): Promise<ApprovalResult>` and `cancelBooking(id: string): Promise<Booking>`. All transitions delegate to the shared `dataStore` singleton (no direct Supabase); `submitBookingRequest` persists as `PENDING` and builds `noticeUrl` from T003; `approveBooking` is allowed only from `PENDING` (no-op returns current `CONFIRMED`) and builds `confirmationUrl`; `cancelBooking` is allowed from `PENDING` or `CONFIRMED` (data-model status lifecycle). (depends on T003)
- [X] T005 [P] Add `supabase/migrations/0006_release_cancelled_slots.sql` — `alter table public.bookings drop constraint if exists bookings_booking_date_time_slot_key;` then `create unique index if not exists bookings_active_slot_key on public.bookings (booking_date, time_slot) where status <> 'CANCELLED';` (data-layer-contract §3, FR-012/FR-013)
- [X] T006 [P] Edit `src/lib/data/adapters/local.ts` — in `createBooking`, before writing, reject a duplicate active slot (an existing `PENDING`/`CONFIRMED` booking with the same `date` + `timeSlot`) by throwing `new DataError("Ese horario ya fue solicitado. Elegí otro horario.")`; `updateBookingStatus`/`updateBookingSchedule` keep persisting status/schedule as today; preserve integer-cents behavior via `calcDepositCents` (data-layer-contract §2, research R7/R11)
- [X] T007 [P] Edit `src/lib/data/adapters/supabase.ts` — in `createBooking` (and `updateBookingSchedule`), detect the Postgres unique-violation code `23505` on the partial index and throw `new DataError("Ese horario ya fue solicitado. Elegí otro horario.")` instead of the raw message; all other errors remain typed `DataError` (data-layer-contract §2, research R7)

**Checkpoint**: Foundation ready — builders, service, migration and adapter parity complete; user stories can begin

---

## Phase 3: User Story 1 - The client submits a booking request and is reassured (Priority: P1) 🎯 MVP

**Goal**: Submitting the public form persists a `PENDING` request, immediately holds the slot, clears
the form and shows an accessible success panel with the exact reassurance copy plus a secondary WhatsApp
notice action (no auto-open).

**Independent Test**: Submit a valid booking request and confirm (a) a pending request exists in the
agenda, (b) the success panel with the exact reassurance copy is shown, (c) the WhatsApp notice action
opens a chat containing the request details, and (d) the chosen slot is no longer selectable for that
date (quickstart S1/S2/S3/S4).

### Implementation for User Story 1

- [X] T008 [US1] Rework the `submit()` handler in `src/components/booking/BookingFlow.svelte` to call `submitBookingRequest(input, WHATSAPP_PHONE)` from `src/lib/services/booking.ts` (not `dataStore` directly); keep the in-flight guard (`submitting`) disabling the control and labeling it **"Procesando reserva…"**, and ignore repeat submits (booking-flow-contract §1, FR-001/FR-002)
- [X] T009 [US1] Replace the current auto-open WhatsApp with a modal success panel in `src/components/booking/BookingFlow.svelte`: show the exact copy "Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad." with two actions — secondary "Enviar comprobante / aviso por WhatsApp" opening `noticeUrl` via `window.open(url, "_blank")`, and a primary dismiss ("Cerrar"/"Nueva solicitud"); render `role="dialog"` `aria-modal="true"` with an accessible name, move focus in on open, restore on close, and dismiss on Escape (booking-flow-contract §2, FR-003/FR-004)
- [X] T010 [US1] On success in `src/components/booking/BookingFlow.svelte`: reset form fields (name, WhatsApp, notes, time) and immediately add the submitted `date`+`timeSlot` to the in-memory unavailable set used by `isUnavailable` so the slot cannot be re-selected without a refetch (booking-flow-contract §2, FR-005/FR-006, research R6)
- [X] T011 [US1] On persistence failure in `src/components/booking/BookingFlow.svelte`: show no success panel, offer/open no WhatsApp action, display the `DataError` message in a visible `role="alert"` element, clear the busy state so the client can retry, and refresh availability (booking-flow-contract §3, FR-007)

**Checkpoint**: User Story 1 fully functional — persist-first submit, success panel, notice link, immediate slot hold (MVP)

---

## Phase 4: User Story 2 - The operator approves a pending request and notifies the client (Priority: P1)

**Goal**: The operator approves a pending request (→ `CONFIRMED`) or cancels it (→ `CANCELLED`), and
approval yields a one-tap WhatsApp confirmation link for the client.

**Independent Test**: With a pending request in the agenda, approve it and confirm the status becomes
confirmed and a confirmation WhatsApp link/message is produced for that client; cancel it and confirm
the slot is released (quickstart S6/S7).

> All tasks in this phase edit the same file (`AdminCalendar.svelte`) — run sequentially, no `[P]`.

- [X] T012 [US2] Add the **Aprobar Cita** action in `src/components/admin/AdminCalendar.svelte`: call `approveBooking(selected.id, WHATSAPP_PHONE)` from `src/lib/services/booking.ts`; offer it only while `selected.status === "PENDING"`; disable it while the action is in flight; reload the agenda after it resolves so the badge reflects `CONFIRMED` (admin-approval-contract §2/§3, FR-009/FR-010)
- [X] T013 [US2] Add/adjust the **Cancelar** action in `src/components/admin/AdminCalendar.svelte`: call `cancelBooking(selected.id)` from the service; offer it for `PENDING` and `CONFIRMED` (not `CANCELLED`); disable it while in flight; reload the agenda after it resolves so the slot is released (admin-approval-contract §2/§4, FR-012)
- [X] T014 [US2] After a successful approval (and for already-`CONFIRMED` bookings) in `src/components/admin/AdminCalendar.svelte`, offer a re-sendable "Notificar confirmación por WhatsApp" link built from `confirmationUrl` that opens in a new tab; when `confirmationUrl` is `null` (phone not digits-only) do not render the link (admin-approval-contract §3/§5, FR-011, booking-flow-contract §4)
- [X] T015 [US2] In `src/components/admin/AdminCalendar.svelte`, surface any `DataError` in the modal's `role="alert"` element and do NOT optimistically flip the badge; repeated approve/cancel on an already-transitioned booking must be a no-op leaving the final state consistent (admin-approval-contract §6, edge cases)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - The operator scans appointments by status at a glance (Priority: P2)

**Goal**: Every appointment carries a color-coded status badge (PENDING amber/orange, CONFIRMED
green-gold, CANCELLED red/muted) with a readable label, and pending items expose inline approve/cancel.

**Independent Test**: Render appointments in all three states and confirm each badge shows the correct
label and distinct color, with approve/cancel actions present only for pending ones (quickstart S5).

### Implementation for User Story 3

- [X] T016 [US3] Ensure the status-color tokens exist in `src/styles/tokens.css` first (design parity, constitution §II / SDD §3): reuse `--accent-gold` / `--bg-wood-pill` for PENDING, `--accent-positive` + `--accent-gold` for CONFIRMED green-gold, `--accent-negative` / `--text-muted` for CANCELLED; add any dedicated token needed and mirror it in `design-system.md` (admin-approval-contract §1, research R8, FR-008)
- [X] T017 [US3] Update the status badges in `src/components/admin/AdminCalendar.svelte` to use readable Spanish labels — `PENDING` → "Pendiente" (amber/orange), `CONFIRMED` → "Confirmado" (green-gold), `CANCELLED` → "Cancelado" (red/muted) — driven only by tokens via `var(--token)`, never raw hex (admin-approval-contract §1, FR-008, SC-005)
- [X] T018 [US3] In `src/components/admin/AdminCalendar.svelte`, render all three states with distinct colors and expose inline **Aprobar**/**Cancelar** actions only for `PENDING`; `CONFIRMED` shows Cancelar + the confirmation link, `CANCELLED` is detail-only (no approve) (admin-approval-contract §1/§2, FR-008/FR-009)

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [X] T019 [P] Update docs — `README.md` and `design-system.md` describe the persist-first success panel, the status badge colors, and the notice/confirmation WhatsApp links (and note the old auto-open behavior is removed)
- [X] T020 [P] a11y/responsive pass — success modal `role="dialog"`/`aria-modal` with accessible name, focus move/restore, Escape dismiss; error alert `role="alert"`; targets ≥44px; no horizontal page scroll from 320px to 1920px (booking-flow-contract §2, FR-016, SC-001)
- [X] T021 [P] Token audit — grep `src/` for raw `#hex`/`rgba(` and confirm only `src/styles/tokens.css` contains literals (constitution §II)
- [X] T022 Run the `quickstart.md` scenarios S1–S9 (submit persists, notice link, failure blocks WhatsApp, duplicate slot rejected, badges, approve→confirm link, cancel releases slot, demo/prod parity, a11y/responsive)
- [X] T023 Run `npm run check` (MUST be **0 errors, 0 warnings**), `npm run build` and `npm run lint` at repository root — all MUST pass (FR/SC-006, quickstart exit criteria)
- [X] T024 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — edits `src/components/booking/BookingFlow.svelte`
- **US2 (P1)**: After Foundational — edits `src/components/admin/AdminCalendar.svelte`
- **US3 (P2)**: After Foundational — adds badge tokens (`tokens.css`) then edits the same `AdminCalendar.svelte` as US2 (sequential with US2)

### Within Each User Story

- Builders (T003) before the service (T004)
- Service (T004) before any UI integration (US1 T008; US2 T012/T013)
- Migration (T005) and adapter parity (T006/T007) before US1/US2 submit/cancel behavior is validated
- Badge tokens (T016) before badge rendering (T017)

### Parallel Opportunities

- Setup: T002
- Foundational: T003, T005, T006, T007 run in parallel (T004 depends on T003)
- Polish: T019, T020, T021 run in parallel (different concerns/files)
- Do NOT parallelize tasks editing `BookingFlow.svelte` (T008 → T009 → T010 → T011)
- Do NOT parallelize tasks editing `AdminCalendar.svelte` (T012 → T013 → T014 → T015 → T017 → T018)

---

## Parallel Example: Foundational

```bash
# After Phase 1 (T004 waits for T003):
Task: "Extend src/lib/utils/booking.ts with notice/confirmation builders"  # T003
Task: "Add supabase/migrations/0006_release_cancelled_slots.sql"           # T005
Task: "Edit src/lib/data/adapters/local.ts (active-slot guard)"            # T006
Task: "Edit src/lib/data/adapters/supabase.ts (map 23505)"                 # T007
```

## Parallel Example: User Stories

```bash
# After Foundational, both P1 stories can proceed in parallel on different files:
Task: "Rework submit + success panel in BookingFlow.svelte"   # US1: T008–T011
Task: "Approve/cancel + confirmation link in AdminCalendar"   # US2: T012–T015
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (persist-first submit + success panel)
4. **STOP and VALIDATE**: quickstart S1–S4 + `npm run check` / `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → builders, service, migration and adapter parity ready
2. Add US1 → test S1–S4 → demo (MVP!)
3. Add US2 → test S6/S7 → demo
4. Add US3 → test S5 → demo
5. Polish → S8/S9 + gates (T019–T024)

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (`BookingFlow.svelte`)
   - Developer B: US2 then US3 (`AdminCalendar.svelte`, sequential)
3. Stories complete and integrate independently (each story is separately testable via quickstart)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Contract constraints are quoted verbatim and MUST NOT change at implementation time:
  - Exact copy: "Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad."
  - Notice copy begins "Hola, acabo de solicitar una reserva…"
  - Duplicate-slot error: "Ese horario ya fue solicitado. Elegí otro horario."
  - Busy label: "Procesando reserva…"
  - Migration: partial unique index `bookings_active_slot_key ... where status <> 'CANCELLED'`
  - Data rules: `priceCents` integer ≥ 0; `depositCents = round(priceCents / 2)`; `timeSlot` HH:mm in the 11:00–19:30 step-30 agenda; `date` not before today; `clientName` trimmed length > 1; `clientWhatsapp` trimmed length ≥ 7
- Components MUST delegate persistence/transitions to `src/lib/services/booking.ts` (constitution §IV, §2.3)
- No new `client:*` directives; `BookingFlow` stays `client:load` and admin UI stays inside the existing `/admin` island (constitution §I)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
