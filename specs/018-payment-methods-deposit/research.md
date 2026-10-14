# Phase 0 Research: Payment Methods, Deposit Proofs & Appointment Review

**Feature**: `018-payment-methods-deposit` | **Date**: 2026-10-14

All unknowns from the Technical Context are resolved below as **Decision / Rationale / Alternatives**,
grounded in the current repository (patterns from features 009, 011, 012, 015, 016, 017).

---

## R1 — Entity placement and naming

**Decision**: Add to `src/lib/types/domain.ts`:

- `PaymentMethodType = "pago_movil" | "binance" | "zelle" | "transfer" | "cash"`;
- `PaymentMethodDetails` — `Record<string, string>` (whitelisted keys per type, no `any`);
- `PaymentMethod { id, type, title, details, instructions, isActive, createdAt }`;
- `NewPaymentMethodInput { type, title, details, instructions }`;
- `BookingEvent { id, bookingId, fromStatus, toStatus, createdAt }` and
  `NewBookingEventInput { bookingId, fromStatus, toStatus }`;
- extend `Booking` with `paymentMethodId: string | null`, `paymentMethodName: string`,
  `paymentReference: string`, `paymentProofUrl: string`.

Extend `BookingStatus` to `"PENDING" | "CONFIRMED" | "REJECTED" | "COMPLETED" | "CANCELLED"` and add a
`BookingPaymentStatus`-style label map in the UI (see R4).

**Rationale**: `domain.ts` holds every persisted entity the hybrid store exposes; the new entities follow
the same camelCase north-bound / snake_case DB convention mapped by the adapters (`toPaymentMethod`,
`toBookingEvent`). Keeping `details` as a flat string map keeps the dynamic per-type form honest without
resorting to `any` (constitution §III).

**Alternatives considered**: A discriminated union keyed by `type` for `details` (rejected: the admin
form is dynamic and the DB column is `jsonb`; a flat string map is simpler and narrower to validate).
Reusing `PaymentChannel` from `config.ts` (rejected: that models only two static channels, not a managed
catalogue).

---

## R2 — Migration `0009_payments_and_booking_proof.sql`

**Decision**: One idempotent migration that:

1. Creates `public.payment_methods`:
   ```sql
   create table if not exists public.payment_methods (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     type text not null check (type in ('pago_movil','binance','zelle','transfer','cash')),
     title text not null,
     details jsonb not null default '{}'::jsonb,
     instructions text not null default '',
     is_active boolean not null default true
   );
   ```
2. Adds the booking payment columns (all nullable, backward compatible):
   `payment_method_id uuid` (FK `payment_methods(id) on delete set null`),
   `payment_method_name text not null default ''`,
   `payment_reference text not null default ''`,
   `payment_proof_url text not null default ''`,
   and the numeric convenience column:
   `deposit_amount numeric(10,2) generated always as (deposit_cents::numeric / 100) stored`.
3. Widens the status check to `('PENDING','CONFIRMED','REJECTED','COMPLETED','CANCELLED')`.
4. Drops and recreates the active-slot partial unique index so it excludes the releasing states:
   ```sql
   drop index if exists bookings_active_slot_key;
   create unique index bookings_active_slot_key
     on public.bookings (booking_date, time_slot)
     where status not in ('CANCELLED','REJECTED');
   ```
5. Creates `public.booking_events` (`id uuid pk`, `booking_id uuid not null references bookings(id) on
   delete cascade`, `from_status text`, `to_status text not null`, `created_at timestamptz default now()`).
6. Enables RLS and defines policies:
   - `payment_methods select public` → `for select using (is_active = true)`;
     `select/insert/update/delete authenticated` (mirrors `services`, migration 0005).
   - `booking_events insert public` (anonymous appointment creation logs the initial `NULL→PENDING`) and
     `select authenticated`; no update/delete (append-only).
   - `bookings` RLS stays as-is (public select+insert, authenticated update) — the new columns are covered
     by the existing policies.
7. Seeds a starter catalogue (mobile payment + Binance) with `is_active = true` using the current
   `config.ts` placeholder values, `on conflict (id) do nothing`.

**Rationale**: Mirrors the proven RLS split and migration style. A generated `deposit_amount` satisfies
the requested schema without a second editable money source. Redefining the partial index is required:
once `REJECTED` exists, `status <> 'CANCELLED'` would wrongly keep rejected slots blocked.

**Alternatives considered**: `alter table ... add column deposit_amount numeric` writable (rejected:
dual source of truth); a separate migration per concern (rejected: the repo ships one migration per
feature); dropping `CANCELLED` (rejected: destructive, see R4).

---

## R3 — DataStore operations and demo parity

**Decision**: Add to `DataStore`:

```ts
listPaymentMethods(input?: { includeInactive?: boolean }): Promise<PaymentMethod[]>;
createPaymentMethod(input: NewPaymentMethodInput): Promise<PaymentMethod>;
updatePaymentMethod(id: string, patch: Partial<NewPaymentMethodInput>): Promise<PaymentMethod>;
togglePaymentMethodActive(id: string): Promise<PaymentMethod>;
deletePaymentMethod(id: string): Promise<void>;

listBookingEvents(bookingId: string): Promise<BookingEvent[]>;   // admin audit view (optional read)
```

Extend `NewBookingInput` with the optional payment fields; `createBooking` and `updateBookingStatus`
**also insert a `booking_events` row** (previous → new) inside both adapters, so traceability is automatic
and identical in demo and production.

Also export `listFallbackPaymentMethods(): Promise<PaymentMethod[]>` from `store.ts` (mirrors
services/team/gallery), seeded from `PAYMENT_METHOD_SEED`.

**Rationale**: The five method operations cover the requested CRUD + toggle. Centralizing event logging in
the adapter's create/update path means every caller (client flow, admin actions, future code) is traced
without duplication; demo parity is guaranteed because the local adapter implements the same rule.

**Alternatives considered**: A production-only DB trigger (rejected in plan Complexity Tracking);
logging events only in the domain service (rejected: the initial `NULL→PENDING` happens in `createBooking`
and would be missed).

---

## R4 — Status vocabulary and transitions

**Decision**: The database and domain keep `PENDING`, `CONFIRMED`, `CANCELLED` and add `REJECTED` and
`COMPLETED`. Slot-occupancy: `PENDING`/`CONFIRMED` occupy; `REJECTED`/`CANCELLED` release; `COMPLETED` is
terminal and occupies (a real past appointment).

Transitions exposed by `src/lib/services/booking.ts`:

- `submitBookingRequest` → creates `PENDING` (logs `NULL→PENDING`).
- `approveBooking` → `PENDING→CONFIRMED` (logs; returns the confirmation link).
- `rejectBooking` → `PENDING→REJECTED` (logs; releases the slot).
- `completeBooking` → `CONFIRMED→COMPLETED` (logs).
- `cancelBooking` (existing) → `*→CANCELLED` (logs; releases the slot).

Illegal transitions (e.g. approving a `REJECTED`/`CANCELLED` booking) throw a typed `DataError`, matching
the existing 009 contract.

**Rationale**: Satisfies the requested four-state lifecycle and preserves 009 behavior/data. "Reject"
and "Cancel" both mean the request is not going ahead, so both release the slot; the distinct labels keep
the operator's intent legible and the audit trail precise.

**Alternatives considered**: Mapping Reject onto `CANCELLED` (rejected: the spec explicitly lists
`rejected`); renaming `CANCELLED` (rejected: destructive to existing data and 009).

---

## R5 — Client payment step design

**Decision**: In `BookingFlow.svelte`, when `selected.requiresDeposit` is true:

- on mount / service selection, load `dataStore.listPaymentMethods()` (active only) with the
  `listFallbackPaymentMethods()` fallback and a non-blocking notice on failure;
- render a step **"4. Pago del adelanto"** between "Tus datos" and the submit button, showing the deposit
  amount and, for each method, its banking details + instructions once selected;
- require `paymentMethodId` + a trimmed `paymentReference` + an uploaded proof; the submit button is
  disabled until all are present, with an inline explanation;
- upload the file with `uploadPaymentProofImage(file)` (returns a public URL / data URL), show a preview
  and allow replacing it before submit;
- pass `paymentMethodId`, `paymentMethodName`, `paymentReference`, `paymentProofUrl` into
  `submitBookingRequest`.

When `requiresDeposit` is false the step is not rendered and no payment fields are sent.

**Rationale**: The step lives inside the existing island (no new hydration), reuses `uploadImage`'s
single-service rule, and keeps validation testable. Loading methods alongside the service list avoids a
late extra round-trip that would stall the step.

**Alternatives considered**: A separate payment island (rejected: extra hydration/coordination, violates
the island-justification rule); auto-opening WhatsApp with the proof (rejected: 009 made WhatsApp a
deliberate secondary action).

---

## R6 — Proof storage

**Decision**: Add `uploadPaymentProofImage(file: File): Promise<string>` to
`src/lib/services/storage.ts`, delegating to `uploadImage(file, { prefix: "proof-" })` (same public
`products` bucket; demo mode inlines a data URL). Validate that the file is an image and within a small
size cap before upload, surfacing a typed `DataError`.

**Rationale**: All uploads already route through this one service (constitution "Data Access"); the
existing prefix option exists for grouping, and no new bucket/policy is needed.

**Alternatives considered**: A dedicated `proofs` bucket (rejected: new storage policies for no benefit);
base64-in-the-row (rejected: bloats the table and the RLS payloads).

---

## R7 — Admin payment-methods tab

**Decision**: Add `"payments"` to the `AdminTab` union, a **Métodos de Pago** sidebar entry (lucide
`CreditCard`) after **Horarios**, `?tab=payments` URL support in `switchTab`/`onMount`, and a new child
component `src/components/admin/AdminPayments.svelte` (rendered inside the existing admin island). The
component provides: a flicker-free list (first-load placeholder only; per-row busy/error), a create/edit
modal whose fields are driven by the selected type (via `src/lib/utils/payments.ts` descriptors), a
toggle for `isActive`, and a confirmed delete. Deleting a method does not touch existing bookings (they
retain the captured name/reference/proof).

**Rationale**: Reuses the exact 015/016 list-state pattern, keeps a single admin island, and the
type→fields descriptor in `utils/payments.ts` keeps the dynamic form declarative and testable.

**Alternatives considered**: A separate route/island (rejected: extra runtime, breaks the single-panel
convention); hardcoding the form per type (rejected: duplication, drift).

---

## R8 — Admin appointment detail + receipt lightbox

**Decision**: Extract the existing modal body from `AdminCalendar.svelte` into a child component
`src/components/admin/AdminBookingDetail.svelte` (props: `booking`, callbacks for approve/reject/
notify/close, plus a link to the existing reschedule flow). It renders client (name/WhatsApp/email when
present), service/date/time/deposit, the payment-verification block (method, reference, `paymentProofUrl`
preview) and the actions **Aprobar**, **Rechazar**, **Notificar**. The receipt opens in a lightbox
(overlay + enlarged image, `Esc` to close, focus restore, `prefers-reduced-motion` respected). `Rechazar`
calls `rejectBooking`; `Notificar` opens the WhatsApp link.

**Rationale**: Keeps the 1073-line calendar focused on layout while isolating the modal's state, action
and accessibility logic; still a plain child of the admin island (no new `client:*`).

**Alternatives considered**: Growing `AdminCalendar.svelte` in place (rejected: harder to review and
test); a new island (rejected: unnecessary hydration).

---

## R9 — WhatsApp notifications

**Decision**: Extend `src/lib/utils/booking.ts` with `buildBookingRejectionLink(booking, phone)` and
update `buildBookingConfirmationLink` to include a deposit-confirmation line. Both keep the existing
digits-only guard returning `null` so no broken link is offered, and preserve accents via
`encodeURIComponent`. The detail modal offers the confirmation link after approval and a rejection link
after reject.

**Rationale**: The builders already exist and are pure/testable; adding the deposit line and a rejection
variant is minimal and consistent.

**Alternatives considered**: A single generic builder with a mode flag (rejected: three small explicit
builders read clearer and match the existing style).

---

## R10 — Tokens, config and dependencies

**Decision**: Add the one missing token `--status-rejected-{bg,edge}` (mirroring `--status-cancelled-*`)
to `tokens.css` and document it in `design-system.md`. Repurpose `PAYMENT_PAGO_MOVIL`/`PAYMENT_BINANCE_PAY`
in `config.ts` as the demo-seed values for `payment_methods` (they remain the fallback when the table is
empty). **No new dependencies**. Public/admin copy stays Spanish.

**Rationale**: Keeps visual style token-driven and avoids a second, competing source for payment channel
values while preserving the env-overridable defaults.
