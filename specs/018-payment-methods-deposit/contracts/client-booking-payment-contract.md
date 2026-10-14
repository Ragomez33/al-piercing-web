# Contract: Client Booking Payment Step

**Feature**: `018-payment-methods-deposit` | Covers `src/components/booking/BookingFlow.svelte`,
`src/lib/services/booking.ts`, `src/lib/services/storage.ts`, `src/lib/utils/payments.ts`.

## 1. When the payment step appears

The step is rendered **only** when the selected service has `requiresDeposit === true`. When false, no
payment UI is shown and `submitBookingRequest` receives no payment fields (FR-014).

## 2. Payment step — "Pago del adelanto"

Between "Tus datos" and the submit button, the flow shows:

- the deposit amount (`formatCents(depositCents)`) and the remaining balance;
- a list of **active** payment methods (`dataStore.listPaymentMethods()`, fallback
  `listFallbackPaymentMethods()`, non-blocking notice on read failure);
- for the selected method: its title, banking `details` (labels from `PAYMENT_METHOD_FIELDS`) and
  `instructions`;
- a required **Número de Referencia** text input (trimmed; non-empty);
- a required **file input** for the receipt (image only), with a local preview and the ability to replace
  it before submit.

If there are **no active methods**, the step shows a clear notice ("No hay métodos de pago disponibles…")
and the submit remains disabled (FR-008 edge case).

## 3. Validation & submit gating

The submit control is disabled until: service + date + time + name + WhatsApp (existing) **and**, when a
deposit is required, `paymentMethodId` + non-empty trimmed `paymentReference` + an uploaded proof. An
inline hint explains what is missing. Upload failure shows a client-facing error, preserves the other
entered data and does not submit (FR-013).

## 4. Proof upload

`uploadPaymentProofImage(file: File): Promise<string>` in `storage.ts`:

- rejects non-images with `DataError("El archivo debe ser una imagen")` (inherited from `uploadImage`);
- rejects files over the size cap with a clear `DataError`;
- production: uploads to the shared public bucket with the `proof-` prefix and returns `getPublicUrl()`;
- demo: returns a data URL (persisted in `localStorage`).

## 5. Persistence

`submitBookingRequest` receives `NewBookingInput` extended with `paymentMethodId`, `paymentMethodName`
(captured from the selected method's `title`), `paymentReference`, `paymentProofUrl`. The appointment is
persisted as **`PENDING`** with all payment fields attached; the existing availability re-validation and
slot-exclusivity behavior is unchanged.

## 6. Success panel

Unchanged from feature 009: the reassurance copy plus the secondary WhatsApp notice action. The deposit
details are already persisted server-side; the notice message may include the deposit amount.

## 7. Acceptance mapping

FR-008…FR-015, FR-027 → this contract; verified by `quickstart.md` scenarios 3 and 4.
