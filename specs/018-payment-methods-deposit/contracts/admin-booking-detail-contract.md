# Contract: Admin Appointment Detail & Notifications

**Feature**: `018-payment-methods-deposit` | Covers `src/components/admin/AdminCalendar.svelte`,
`src/components/admin/AdminBookingDetail.svelte`, `src/lib/services/booking.ts`,
`src/lib/utils/booking.ts`, `src/styles/tokens.css`.

## 1. Opening the detail

Selecting an appointment in the calendar day list (or from any admin list) opens
`AdminBookingDetail` for that booking. The component receives the `booking`, the WhatsApp studio phone and
callbacks (`onClose`, `onChanged`); it is a plain child of the existing admin island.

## 2. Content shown

- **Cliente**: name; WhatsApp; email when present (otherwise the row is omitted).
- **Servicio**: service name; date; time; deposit amount (`formatCents(depositCents)`); total price.
- **Verificación de pago**:
  - the payment method name (`paymentMethodName`) when present;
  - the reference number (`paymentReference`) when present;
  - a preview of `paymentProofUrl` when present, clickable to open a **lightbox** (enlarged image);
  - when any of these are absent, an explicit "Sin comprobante de pago" state; approve/reject/notify
    remain available (FR-019).
- **Estado**: status badge.

## 3. Actions

- **Aprobar** (visible for `PENDING`): calls `approveBooking(id, phone)` → `PENDING→CONFIRMED`, logs the
  transition, and reveals the WhatsApp confirmation link.
- **Rechazar** (visible for `PENDING`): calls `rejectBooking(id)` → `PENDING→REJECTED`, releases the slot,
  logs the transition, and reveals the WhatsApp rejection link (FR-016…FR-022).
- **Notificar al cliente**: opens the pre-filled WhatsApp link (`target="_blank"
  rel="noopener noreferrer"`) for the client's number with service, date, time and deposit confirmation.
  When the number is not digits-only the builder returns `null` and the action shows a clear message
  instead of a broken link (FR-025/FR-026).
- The pre-existing **Reagendar** action stays available (via the existing calendar reschedule flow or a
  link/button that hands control back to it).
- For `CONFIRMED`/`REJECTED`/`COMPLETED` bookings, approve/reject are **not** offered (FR-022).

## 4. Action state & errors

A single `acting` state (`idle | approving | rejecting | notifying`) disables the in-flight button and
shows a busy label; a failure sets an inline `role="alert"` error and leaves the booking unchanged. On
success the modal reflects the new status; the calendar refreshes from `onChanged`.

## 5. Transition logging (traceability)

Every status change is recorded in `booking_events` with the previous and new status. This is enforced by
the data layer (see `payment-data-contract.md §5`) and invoked only through `src/lib/services/booking.ts`
(constitution §IV), never from the component directly (FR-024).

## 6. Lightbox & accessibility

- The receipt lightbox uses `--overlay-backdrop`, an enlarged image with alt text, a ≥44px close control,
  `Esc` to close and focus restore to the preview trigger; `aria-modal` + labelled dialog.
- Transitions are suppressed under `prefers-reduced-motion`; no horizontal scroll 320–1920px.
- New badge color for `REJECTED` uses the new `--status-rejected-*` tokens.

## 7. Acceptance mapping

FR-016…FR-026, FR-028 → this contract; verified by `quickstart.md` scenarios 5, 6 and 7.
