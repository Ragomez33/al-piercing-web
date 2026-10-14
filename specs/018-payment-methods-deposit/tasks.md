---
description: "Task list for feature 018-payment-methods-deposit"
---

# Tasks: Payment Methods, Deposit Proofs & Appointment Review

**Input**: Design documents from `/specs/018-payment-methods-deposit/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: No test tasks. The feature specification does not request TDD and the project ships no unit-test runner; verification is the `astro check` / `build` gate plus the manual `quickstart.md` scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in each description

## Path Conventions

Single-project Astro/Svelte app: `src/`, `supabase/` at repository root (per `plan.md`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the zero-error baseline and the one new design token the feature needs.

- [X] T001 Confirm the working branch `018-payment-methods-deposit`; run `npm install`, `npx astro check` and `npm run build` to record the zero-error baseline before changes.
- [X] T002 [P] Add `--status-rejected-bg` and `--status-rejected-edge` tokens to `src/styles/tokens.css` (mirroring `--status-cancelled-*`) and document them in `design-system.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared data layer (migration, types, adapters, realtime, seeds, utilities) that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create `supabase/migrations/0009_payments_and_booking_proof.sql` per `contracts/payment-data-contract.md §3`: `public.payment_methods` (`type text check (type in ('pago_movil','binance','zelle','transfer','cash'))`, `title text not null`, `details jsonb not null default '{}'::jsonb`, `instructions text not null default ''`, `is_active boolean not null default true`, `created_at timestamptz default now()`); `bookings` columns (`payment_method_id uuid` FK → `payment_methods(id) ON DELETE SET NULL`, `payment_method_name text not null default ''`, `payment_reference text not null default ''`, `payment_proof_url text not null default ''`, `deposit_amount numeric(10,2) generated always as (deposit_cents::numeric / 100) stored`); widen `status` check to `('PENDING','CONFIRMED','REJECTED','COMPLETED','CANCELLED')`; drop + recreate `bookings_active_slot_key` with `where status not in ('CANCELLED','REJECTED')`; create `public.booking_events` (`id uuid pk`, `booking_id uuid not null references bookings(id) on delete cascade`, `from_status text`, `to_status text not null`, `created_at timestamptz default now()`); enable RLS with `payment_methods select public` (`using (is_active = true)`) + `select/insert/update/delete authenticated`, and `booking_events insert public` + `select authenticated` (append-only); seed starter methods from the `config.ts` values with `on conflict (id) do nothing`.
- [X] T004 Update `src/types/supabase.ts` to add `payment_methods` and `booking_events` blocks (`Row`/`Insert`/`Update`/`Relationships`) and the new `bookings` columns (`payment_method_id`, `payment_method_name`, `payment_reference`, `payment_proof_url`, `deposit_amount` read-only), matching migration 0009.
- [X] T005 [P] Add domain types in `src/lib/types/domain.ts`: `PaymentMethodType = "pago_movil" | "binance" | "zelle" | "transfer" | "cash"`, `PaymentMethodDetails = Record<string, string>`, `PaymentMethod` (`id`, `type`, `title`, `details`, `instructions`, `isActive`, `createdAt`), `NewPaymentMethodInput`, `BookingEvent` (`id`, `bookingId`, `fromStatus: BookingStatus | null`, `toStatus`, `createdAt`), `NewBookingEventInput`; extend `BookingStatus` with `"REJECTED" | "COMPLETED"` and `Booking` with `paymentMethodId: string | null`, `paymentMethodName: string`, `paymentReference: string`, `paymentProofUrl: string`, optional `clientEmail`; extend `NewBookingInput` with the optional payment fields + `clientEmail`; extend the `DataStore` interface with `listPaymentMethods`, `createPaymentMethod`, `updatePaymentMethod`, `togglePaymentMethodActive`, `deletePaymentMethod`, `listBookingEvents`.
- [X] T006 [P] Create `src/lib/data/payment-methods.ts` with `PAYMENT_METHOD_SEED: PaymentMethod[]` (a Pago Móvil and a Binance method seeded from the `config.ts` values, `isActive: true`).
- [X] T007 [P] Create `src/lib/utils/payments.ts` with `PAYMENT_METHOD_FIELDS` descriptors (per-type label + field keys + required flags) and `validatePaymentMethodInput(input)` enforcing: title non-empty (`DataError("El título es obligatorio")`) and every required type field non-empty (`DataError("Completa los datos del método de pago")`).
- [X] T008 [P] Add `uploadPaymentProofImage(file: File): Promise<string>` to `src/lib/services/storage.ts`, delegating to `uploadImage(file, { prefix: "proof-" })` and rejecting non-images / oversize files with a typed `DataError`.
- [X] T009 Update `src/lib/data/realtime.ts`: add `"paymentMethods"` to `DataResource` and `RESOURCES`, and add a `postgres_changes` channel on `payment_methods` mapping to `notify("paymentMethods")`.
- [X] T010 Update `src/lib/data/adapters/supabase.ts`: add `toPaymentMethod(row)` and `toBookingEvent(row)`, extend `toBooking` to map `payment_method_id`/`payment_method_name`/`payment_reference`/`payment_proof_url`, implement the five payment-method operations (query `eq("is_active", true)` when `!includeInactive`) and `listBookingEvents`, and insert a `booking_events` row in `createBooking` (`null→PENDING`) and `updateBookingStatus` (`from→to`).
- [X] T011 Update `src/lib/data/adapters/local.ts`: add keys `alpi:paymentmethods:v1` and `alpi:bookingevents:v1`, guards `isPaymentMethod`/`isBookingEvent`, seed from `PAYMENT_METHOD_SEED`, implement the same five payment-method operations + `listBookingEvents` with validation parity, extend `isBooking` for the new statuses/payment fields, and perform the same automatic `booking_events` logging on create/status change.
- [X] T012 Update `src/lib/data/store.ts`: publish `publishDataChange("paymentMethods")` after successful `createPaymentMethod`/`updatePaymentMethod`/`togglePaymentMethodActive`/`deletePaymentMethod`, and export `listFallbackPaymentMethods()` (mirroring the existing fallbacks).

**Checkpoint**: Foundation ready — all user stories can now start.

---

## Phase 3: User Story 1 - The client pays a deposit and submits proof (Priority: P1) 🎯 MVP

**Goal**: When a service requires a deposit, the client selects an active payment method, sees its banking details/instructions, enters a reference and uploads a receipt; the appointment is saved `PENDING` with all payment fields attached.

**Independent Test**: Choose a deposit-required service, pick a method, enter a reference, upload an image and submit; confirm a `PENDING` appointment exists storing the method, reference and receipt URL. With a non-deposit service no payment step appears.

- [X] T013 [US1] Extend `submitBookingRequest` in `src/lib/services/booking.ts` to persist the new `NewBookingInput` payment fields (`paymentMethodId`, `paymentMethodName`, `paymentReference`, `paymentProofUrl`) with the appointment starting as `PENDING` (existing availability re-validation and slot-exclusivity unchanged; no WhatsApp auto-open).
- [X] T014 [US1] Add the conditional **"Pago del adelanto"** step to `src/components/booking/BookingFlow.svelte`, rendered only when `selected.requiresDeposit` is true (FR-008…FR-015): load `dataStore.listPaymentMethods()` with the `listFallbackPaymentMethods()` fallback and a non-blocking notice; show deposit amount + each method's `details`/`instructions` (labels from `PAYMENT_METHOD_FIELDS`); require `paymentMethodId` + non-empty trimmed reference + an uploaded proof before enabling submit; preview/replace the proof via `uploadPaymentProofImage`; show a clear notice and keep submit disabled when no active methods exist; send nothing when `!requiresDeposit`.

**Checkpoint**: User Story 1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 - The operator reviews a pending appointment and decides (Priority: P1)

**Goal**: Clicking an appointment opens a detail view with client/service/deposit/payment data and an enlargeable receipt, plus direct Approve/Reject/Notify actions; each decision records a status transition.

**Independent Test**: With a pending appointment that has a reference and receipt, open its detail, confirm client/service/deposit/payment fields and enlarged receipt, approve it (→ confirmed) and reject another (→ rejected, slot released).

- [X] T015 [US2] Extend `src/lib/services/booking.ts` with `rejectBooking(id)` (`PENDING→REJECTED`) and `completeBooking(id)` (`CONFIRMED→COMPLETED`), plus update `approveBooking` to the widened status set; enforce legal transitions with a typed `DataError` (illegal transitions rejected) and rely on the data layer for `booking_events` logging (do not duplicate logging in the service). Depends on T010/T011/T013.
- [X] T016 [US2] Create `src/components/admin/AdminBookingDetail.svelte` (plain child, no `client:*`): render client name/WhatsApp (email when present), service/date/time/deposit/total, an "Estado" badge, a **Verificación de pago** block showing `paymentMethodName`, `paymentReference` and a preview of `paymentProofUrl` (or an explicit "Sin comprobante de pago" state), the action buttons (Aprobar/Rechazar/Notificar + Reagendar), a single `acting` state (`idle | approving | rejecting | notifying`) with disabled/busy labels and an inline `role="alert"` error, and a keyboard-accessible receipt **lightbox** (`Esc` closes, focus restore, `aria-modal`, `prefers-reduced-motion`).
- [X] T017 [US2] Refactor `src/components/admin/AdminCalendar.svelte` to render `AdminBookingDetail` for the selected appointment (replacing the inline modal body), add the `REJECTED` label to its `STATUS_LABELS` and a rejected badge using the new `--status-rejected-*` tokens, and refresh the agenda through the detail's `onChanged` callback.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - The operator manages the studio's payment methods (Priority: P1)

**Goal**: A dedicated **Métodos de Pago** admin tab where an operator creates, edits, activates/deactivates and deletes methods with a type-driven dynamic form.

**Independent Test**: Create a mobile-payment method (fields: Cédula/RIF, Teléfono, Banco), save, toggle inactive (gone from clients, present in admin), edit, delete — each change persists without flicker; incomplete methods are refused.

- [X] T018 [US3] Create `src/components/admin/AdminPayments.svelte` (plain child, no `client:*`) implementing `contracts/admin-payments-ui-contract.md`: a flicker-free list (first-load placeholder only; in-place patching; per-row `busy` + `class:busy`/`aria-busy`; inline error preserving the previous list), a create/edit modal whose fields are driven by `PAYMENT_METHOD_FIELDS` (type `<select>` re-renders required detail inputs; required title; optional instructions), client-side validation mirroring T007, an activate/deactivate toggle, and a confirmed delete that never mutates existing bookings.
- [X] T019 [US3] Wire the tab into `src/components/admin/AdminPanel.svelte`: add `"payments"` to the `AdminTab` union, a **Métodos de Pago** sidebar entry (lucide `CreditCard`) after **Horarios** with `class:active`/`aria-current`, `?tab=payments` handling in `switchTab`/`onMount` (+ `refreshPaymentMethods`), and `{:else if tab === "payments"}` rendering `<AdminPayments />`. Depends on T018.

**Checkpoint**: All three P1 stories independently functional.

---

## Phase 6: User Story 4 - The operator notifies the client through WhatsApp (Priority: P2)

**Goal**: After deciding, the operator triggers a pre-filled WhatsApp message including service, date, time and deposit confirmation.

**Independent Test**: On an appointment, trigger Notify → a WhatsApp chat opens for the client's number with a message containing the service, date, time and deposit confirmation; accents are preserved; a non-digits number yields a clear message instead of a broken link.

- [X] T020 [US4] Extend `src/lib/utils/booking.ts`: add `buildBookingRejectionLink(booking, phone)` and include a deposit-confirmation line in `buildBookingConfirmationLink`, keeping the digits-only guard that returns `null` and `encodeURIComponent` accent preservation.
- [X] T021 [US4] Wire notifications in `src/components/admin/AdminBookingDetail.svelte`: reveal the confirmation link after approval and the rejection link after rejection, expose an explicit **Notificar** control, and show a clear message (no link) when the builder returns `null` (non-digits number). Depends on T016/T017/T020.

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and the mandatory quality gates.

- [X] T022 [P] Update `README.md` and `design-system.md` to document the **Métodos de Pago** tab, the client payment step, and the appointment detail modal (route/tab/structure notes).
- [X] T023 Run `npx astro check` and `npm run build`; fix all type/compile errors to **zero** (explicit user requirement) across the changed files.
- [X] T024 Run `npm run lint` and execute the `quickstart.md` scenarios (payment CRUD; client deposit + proof; detail modal + lightbox; notify + `booking_events` traceability; realtime/regression).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**. Within it, T005 (domain types) blocks T009–T012; T003/T004/T006/T007/T008 are largely independent.
- **User Stories (Phase 3+)**: All depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all targeted stories.

### User Story Dependencies

- **US1 (P1)**: after Foundational; no dependency on other stories.
- **US2 (P1)**: after Foundational; shares `src/lib/services/booking.ts` with US1 (T013 precedes T015, not parallel).
- **US3 (P1)**: after Foundational; fully independent of US1/US2.
- **US4 (P2)**: after Foundational; shares `src/components/admin/AdminBookingDetail.svelte` with US2, so it follows T016/T017.

### Same-file sequencing (do NOT parallelize)

- `src/lib/services/booking.ts`: T013 → T015.
- `src/components/admin/AdminBookingDetail.svelte`: T016/T017 → T021.
- `src/types/supabase.ts`: T004; `src/lib/types/domain.ts`: T005 (single-writer each).

### Parallel Opportunities

- T002, T005, T006, T007, T008 can run in parallel once their prerequisites exist.
- After Foundational, US3 (T018–T019) runs fully in parallel with US1/US2 because it touches disjoint files.
- T022 (docs) can run in parallel with T023/T024.

#### Parallel example — Foundational seeds/utilities

```bash
Task: "T006 Create src/lib/data/payment-methods.ts PAYMENT_METHOD_SEED"
Task: "T007 Create src/lib/utils/payments.ts PAYMENT_METHOD_FIELDS + validation"
Task: "T008 Add uploadPaymentProofImage to src/lib/services/storage.ts"
```

#### Parallel example — US3 alongside US1/US2

```bash
Task: "T018 Create src/components/admin/AdminPayments.svelte"
Task: "T019 Wire payments tab into src/components/admin/AdminPanel.svelte"
# in parallel with US1 T013/T014 and US2 T015/T016/T017
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (T013–T014).
3. **STOP and VALIDATE**: run `quickstart.md` Scenario 2 (client deposit + proof).
4. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate (deposit + proof) → demo.
3. US2 → validate (detail + approve/reject) → demo.
4. US3 → validate (methods CRUD) → demo.
5. US4 → validate (WhatsApp notify) → demo.
6. Polish → run `npx astro check`, `npm run build`, `npm run lint`, full quickstart.

### Parallel Team Strategy

After Foundational: Developer A → US1 then US2 (shared `booking.ts`/detail ordering); Developer B → US3; then anyone picks up US4 and Polish docs.

---

## Notes

- `[P]` = different files, no dependencies.
- No test tasks: no runner in the repo and no TDD requested; the gate is `astro check` + `build` + manual `quickstart.md`.
- Integer cents are authoritative; DB `deposit_amount` is generated (never written).
- All status transitions go through `src/lib/services/booking.ts`; the data layer records `booking_events`.
- Every component keeps data access behind `dataStore`/services; uploads only via `src/lib/services/storage.ts`.
- Commit after each task or logical group; stop at checkpoints to validate each story independently.
