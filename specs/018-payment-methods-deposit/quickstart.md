# Quickstart Validation: Payment Methods, Deposit Proofs & Appointment Review

**Feature**: `018-payment-methods-deposit` | **Date**: 2026-10-14

Runnable validation for the end-to-end behavior. References the contracts/data model instead of
duplicating them. Implementation details live in `tasks.md` and the implementation phase.

## Prerequisites

- Node `>=22.12.0`, dependencies installed (`npm install`).
- Demo mode (default) needs no backend: `localStorage` seeds `alpi:paymentmethods:v1` and
  `alpi:bookingevents:v1`.
- Production mode: set `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, apply
  `supabase/migrations/0009_payments_and_booking_proof.sql`, and (optional) enable Realtime on
  `payment_methods` for live cross-device updates.

## Setup & commands

```bash
npm install
npm run dev        # local site (default http://localhost:4321)
npm run check      # npx astro check — MUST pass with 0 errors
npm run build      # static build MUST succeed
npm run lint
```

## Automated gate

- `npx astro check` → **0 errors, no type discrepancies** (explicit user requirement).
- `npm run build` → succeeds; `/`, `/landing-v2`, `/booking` and `/admin` are emitted.

## Scenario 1 — Payment methods CRUD (FR-001…FR-007)

1. Open `/admin?tab=payments` with an authenticated session.
2. Create a **Pago Móvil** method: confirm the form asks for Cédula/RIF, Teléfono and Banco; save →
   the row appears in place without flicker.
3. Edit it, change its type to **Binance** → the fields switch to Pay ID/Titular; save.
4. Toggle it inactive → it disappears from the client flow but stays in the admin list.
5. Delete it (confirm) → removed; a booking that used it still shows its captured name/reference.
6. Try to save with an empty title / missing required field → refused with an inline message, nothing
   created.

Expected: create/edit/toggle/delete are flicker-free; validation blocks incomplete methods.

## Scenario 2 — Client deposits and uploads proof (FR-008…FR-015)

1. Open `/booking`, choose a service with **Requiere adelanto**.
2. Confirm a **payment step** appears showing the deposit amount and the active methods.
3. Select a method → its banking details and instructions are shown.
4. Enter a reference, upload a receipt image → preview appears.
5. Submit → success panel; in `/admin` a **PENDING** appointment exists carrying the method, reference
   and receipt.
6. Repeat with a service **without** deposit → no payment step; appointment saved without payment data.
7. Submit with a missing reference or no file → refused with a clear error, entered data preserved.
8. Deactivate every method → the step shows a notice and submit stays disabled.

Expected: deposit-required appointments always carry method + reference + proof; others do not.

## Scenario 3 — Appointment detail modal (FR-016…FR-022)

1. Open `/admin`, find the pending appointment from Scenario 2 and click it.
2. Confirm the modal shows client name/WhatsApp (and email if present), service/date/time/deposit,
   the payment method, the reference, and a **receipt preview**.
3. Click the receipt → lightbox opens enlarged; `Esc` closes and focus returns to the preview.
4. Press **Aprobar** → status becomes **Confirmado** (badge updates); the transition is recorded.
5. On another pending appointment press **Rechazar** → status becomes **Rechazado**; its slot is released
   (that date/time is bookable again on `/booking`).
6. Open a confirmed/rejected appointment → approve/reject are no longer offered.

Expected: full payment verification in one view; decisions applied and slot released on reject.

## Scenario 4 — Notification & traceability (FR-024…FR-026)

1. On an approved appointment press **Notificar** → a WhatsApp chat opens for the client's number with a
   message including service, date, time and deposit confirmation; accented characters are intact.
2. On a rejected appointment press **Notificar** → the rejection message opens.
3. Inspect the stored transitions: each status change added a `booking_events` row with the correct
   previous → new status (demo: `alpi:bookingevents:v1`; production: `select * from booking_events`).
4. Use a client number that is not digits-only → no chat opens and a clear message is shown.

Expected: pre-filled accurate messages; every transition traced.

## Scenario 5 — Realtime & regression (FR-027…FR-028)

1. Open `/booking` in tab A and `/admin?tab=payments` in tab B; create/toggle a method in B → tab A's
   payment step updates without a reload (or on focus fallback).
2. Run `npm run check`, `npm run build`, `npm run lint`.
3. Spot-check `/booking` (availability), `/catalog`, `/landing-v2` and `/` for regressions.

Expected: live updates work or degrade gracefully; unrelated pages unchanged; all gates pass.
