# Phase 0 Research: Booking Request Persistence & Admin Approval

All `Technical Context` unknowns and design questions are resolved below. No `NEEDS CLARIFICATION`
remainders.

## R1. Releasing a slot when a booking is cancelled

- **Decision**: Add migration `supabase/migrations/0006_release_cancelled_slots.sql` that drops the
  table-level `unique (booking_date, time_slot)` constraint and creates a **partial unique index**
  covering only active rows: `... on public.bookings (booking_date, time_slot) where status <> 'CANCELLED'`.
- **Rationale**: FR-012 requires a cancelled request to free its date/time, and FR-013 requires public
  availability to ignore `CANCELLED`. With the current all-status unique constraint, a cancelled row
  permanently reserves the slot at the DB level even though the UI lists it as free — a latent
  double-booking failure. A partial index preserves exclusivity for `PENDING`/`CONFIRMED` (constitution
  §IV "no two non-cancelled appointments may share the same slot") while allowing reuse after cancel.
- **Alternatives considered**: (a) Physically deleting cancelled rows — rejected (loses audit history,
  contradicts soft-cancel patterns). (b) Reusing the cancelled row by updating its client data — rejected
  (overwrites history, races with concurrent readers). (c) Application-only checks — rejected (does not
  enforce integrity under concurrency).

## R2. Does a PENDING request hold the slot?

- **Decision**: Yes. Public availability counts `PENDING` + `CONFIRMED` (already the behavior of
  `getBookedSlots`) plus manual `time_blocks`. Documented as a justified deviation in `plan.md`.
- **Rationale**: The feature explicitly requires an immediate hold on submit ("bloquea inmediatamente ese
  slot"). The repo constitution §IV mandates slot exclusivity for non-cancelled appointments; treating a
  pending request as an active "non-cancelled appointment" reconciles the requirement with the DB
  partial index.
- **Alternatives considered**: PENDING non-blocking (constitution's "pending deposits never block a slot")
  — rejected for this feature because it would allow two clients to request the same slot and contradicts
  the explicit requirement. The "pending deposit" clause remains satisfied because no deposit ledger exists
  in the current model; when one is added, deposit validation will be a separate signal from request hold.

## R3. Where do status transitions live?

- **Decision**: Introduce `src/lib/services/booking.ts` exposing `submitBookingRequest`, `approveBooking`
  and `cancelBooking`, each wrapping `dataStore` and returning the updated `Booking` plus any WhatsApp
  link. Components call only these functions.
- **Rationale**: Constitution §IV ("status transitions MUST occur exclusively through domain service
  functions") and §2.3 ("islands MUST delegate data access to `src/lib/services`"). The current inline
  `dataStore.createBooking`/`updateBookingStatus` calls in components violate both.
- **Alternatives considered**: (a) Keep calls inline — rejected (governance violation, duplicated rules).
  (b) Put transitions in `src/lib/utils/booking.ts` — rejected: utils are pure helpers, not the service
  boundary named by the constitution.

## R4. Public submit UX and accessibility

- **Decision**: Keep the form; on success, render a modal success panel (`role="dialog"`, `aria-modal`,
  labelled) containing the exact reassurance copy and two actions: a primary "Cerrar"/"Nueva solicitud"
  (dismiss) and the secondary "Enviar comprobante / aviso por WhatsApp" link. Move focus to the panel on
  open, restore focus on close, and keep it keyboard dismissible.
- **Rationale**: Matches the requested "pantalla/modal de éxito", satisfies principle V (semantic,
  labeled, focus-visible, ≥44px), and avoids the current surprise auto-opening of WhatsApp.
- **Alternatives considered**: Inline banner instead of modal — rejected (spec explicitly allows a
  modal and a focused confirmation is clearer); auto-open WhatsApp — rejected (contradicts FR-003/FR-004
  and hides storage failures from the user).

## R5. WhatsApp messages: notice vs. confirmation

- **Decision**: Refactor `src/lib/utils/booking.ts` to expose two pure builders:
  `buildBookingNoticeLink(...)` → "Hola, acabo de solicitar una reserva…" (service, date, time) for the
  success panel; and `buildBookingConfirmationLink(...)` → studio confirmation (service, date, time,
  deposit/balance as applicable) for the admin approve action. Both return `null` when the phone is not
  digits-only; both preserve accents via `encodeURIComponent`.
- **Rationale**: FR-004/FR-011 and FR-015. Distinct intents should not share one message; keeping them
  as pure functions preserves testability and the existing util's conventions.
- **Alternatives considered**: Keep the single existing request-message builder — rejected (it produces a
  booking request message, not a post-submit notice or an approval confirmation).

## R6. Immediate slot hold in the public view

- **Decision**: After a successful submit, add the chosen `timeSlot` to the in-memory unavailable set
  used to disable slot buttons (no refetch needed), and reset the form fields.
- **Rationale**: FR-005/FR-006; avoids a visible window where the client could re-pick the same slot, and
  avoids an extra network round trip.
- **Alternatives considered**: Re-run `getBookedSlots` after submit — rejected (slower, and the result is
  already known locally).

## R7. Duplicate slot / concurrency error handling

- **Decision**: When the insert violates the uniqueness rule (Postgres `23505`), the adapter maps it to a
  friendly `DataError` ("Ese horario ya fue solicitado. Elegí otro horario."). The submit handler surfaces
  this via the existing error alert, does not open WhatsApp, and refreshes availability.
- **Rationale**: FR-007 and the "slot taken between selection and submit" edge case; the DB remains the
  source of truth for exclusivity under concurrency.
- **Alternatives considered**: Pre-checking availability only — rejected (TOCTOU race; the unique index is
  the real guarantee).

## R8. Status badge colors ("verde dorado")

- **Decision**: Reuse `--accent-gold`/`--bg-wood-pill` for PENDING, `--accent-positive` (+ gold accent
  border/glow) for CONFIRMED, and `--accent-negative` + `--text-muted` for CANCELLED. If the "green-gold"
  confirmed treatment needs a dedicated value, add a token to `tokens.css` first and note it in
  `design-system.md`.
- **Rationale**: FR-008/SC-005 and design-system parity (tokens only; raw hex only in `tokens.css`).
- **Alternatives considered**: Inline colors in the component — rejected (violates principle II / design
  parity).

## R9. Double-submit and idempotency

- **Decision**: Guard with the existing in-flight flag: while `submitting` is true the control is disabled
  and shows "Procesando reserva…"; repeated submits are ignored. Approval/cancel buttons are disabled
  while their action is in flight.
- **Rationale**: FR-002 and the double-submission / double-approval edge cases.
- **Alternatives considered**: Client-generated idempotency keys — overkill for a single-operator studio.

## R10. Admin approval → notification link

- **Decision**: On approval success, the service returns the updated `Booking` and the operator sees a
  "Notificar confirmación por WhatsApp" link (also offered for already-confirmed bookings so it is
  re-sendable). Sending remains a manual tap.
- **Rationale**: FR-011; no automated messaging backend exists.
- **Alternatives considered**: Auto-opening WhatsApp on approve — rejected (operator may be mid-task;
  prebuilt link is non-disruptive and re-openable).

## R11. Demo-mode parity

- **Decision**: The local adapter enforces the same active-slot uniqueness (reject a duplicate
  `PENDING`/`CONFIRMED` date+time) and the same status transitions, so demo and production behave
  identically, including the success panel and WhatsApp links.
- **Rationale**: FR-014; the app already auto-selects demo vs production from env vars.
- **Alternatives considered**: Let demo diverge — rejected (hides bugs until production).

## R12. Type-check and build gates

- **Decision**: The change must pass `astro check` with zero errors (explicit user requirement), plus
  `npm run build` and `npm run lint`. `Booking`/`BookingStatus`/`DataStore` remain the single shared
  types; the partial-index migration does not alter columns so `src/types/supabase.ts` stays valid.
- **Rationale**: Constitution §2.1/§III and the user's verification instruction.
- **Alternatives considered**: None — this is a hard gate.
