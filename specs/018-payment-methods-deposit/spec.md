# Feature Specification: Payment Methods, Deposit Proofs & Appointment Review

**Feature Branch**: `018-payment-methods-deposit`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Implementa el sistema completo de Gestión de Métodos de Pago, Pago de Adelanto con Comprobantes, Modal de Citas y Notificaciones para ALPIERCING: (1) Migración de base de datos con una tabla de métodos de pago (tipo, título, datos bancarios, instrucciones, activo) y la extensión de la tabla de citas con campos de pago (monto del adelanto, método, referencia, comprobante, estado), con lectura pública de métodos activos y CRUD restringido a administradores, y creación anónima de citas con comprobante. (2) Nueva pestaña 'Métodos de Pago' en el admin para crear, editar, activar/desactivar y eliminar métodos, con formulario de campos dinámicos por tipo. (3) Flujo del cliente: si el servicio requiere adelanto, consultar los métodos activos, mostrar los datos bancarios e instrucciones del método elegido, y exigir método, número de referencia y carga del comprobante, registrando la cita como pendiente. (4) Modal detallado de citas en el admin con datos del cliente, servicio/horario/monto, verificación de pago (método, referencia, visor de comprobante) y acciones de Aprobar/Rechazar/Notificar. (5) Registro de transición de estados y opción de notificación por WhatsApp con mensaje pre-formateado con los detalles de la cita."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The client pays a deposit and submits proof of payment (Priority: P1)

A visitor chooses a service that requires a deposit. Before confirming, the flow presents the studio's active payment options (for example mobile payment, crypto, international transfer or cash). The visitor picks the one they used, sees that option's banking details and instructions, enters the payment **reference number**, and uploads a **screenshot of the receipt**. On submission the appointment is recorded as **pending** and carries all the payment details, so the studio has everything it needs to verify the deposit.

**Why this priority**: This is the core money-and-trust moment. Without collecting the reference and receipt alongside the booking, the studio cannot verify the deposit and the appointment cannot be safely confirmed.

**Independent Test**: Choose a deposit-required service, select an available slot, pick a payment method, enter a reference and upload an image, then submit; confirm a pending appointment exists that stores the chosen method, reference and receipt URL.

**Acceptance Scenarios**:

1. **Given** a service that requires a deposit, **When** the client reaches the payment step, **Then** all currently active payment methods are offered for selection.
2. **Given** a selected payment method, **When** it is highlighted, **Then** its banking details and its instructions are displayed to the client.
3. **Given** a method, a reference number and an uploaded image, **When** the client submits, **Then** the appointment is recorded as pending with the method, reference and receipt attached.
4. **Given** the payment step, **When** the method, reference or receipt is missing/invalid, **Then** submission is refused with a clear inline message and no appointment is created.

---

### User Story 2 - The operator reviews a pending appointment and decides on it (Priority: P1)

An operator opens the admin agenda and clicks an appointment. A detail view opens showing the client's information, the service, date, time and deposit amount, the payment method used, the reference number, and a large view of the uploaded receipt. From that view the operator can **approve**, **reject**, or **notify** the client, and every decision is recorded as a state transition.

**Why this priority**: Verification of the deposit is what turns a tentative request into a confirmed appointment; the receipt is the evidence the operator acts on.

**Independent Test**: With a pending appointment that has a reference and receipt, open its detail view and confirm the client, service, deposit and payment details are shown with an enlarged receipt, then approve it and confirm the status becomes confirmed.

**Acceptance Scenarios**:

1. **Given** an appointment in the agenda, **When** the operator selects it, **Then** a detail view shows client name, phone and email, plus service, date, time and deposit amount.
2. **Given** an appointment with a submitted receipt, **When** its detail view opens, **Then** the payment method, reference number and a preview/lightbox of the receipt image are shown.
3. **Given** a pending appointment, **When** the operator approves it, **Then** its status becomes confirmed and the transition is recorded.
4. **Given** a pending appointment, **When** the operator rejects it, **Then** its status becomes rejected, its slot is released, and the transition is recorded.
5. **Given** an appointment already confirmed, rejected or completed, **When** viewed, **Then** decisions already taken are not offered again.

---

### User Story 3 - The operator manages the studio's payment methods (Priority: P1)

From a dedicated **Payment Methods** area in the admin, an operator creates, edits, activates/deactivates and deletes the ways clients can pay the deposit. Each method has a type (for example mobile payment, crypto, Zelle, transfer or cash) that drives which banking fields are requested (for example ID/tax number, phone and bank for mobile payment; a Pay ID for crypto; an email/account for international transfer), a title, free-form instructions and an active flag.

**Why this priority**: The client payment step depends on this catalog; without managed methods there is nothing to select and no banking details to show.

**Independent Test**: Create a mobile-payment method, confirm only the relevant fields are requested, save it, toggle it inactive, confirm it no longer appears to clients, edit it and delete it, verifying each change persists.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they open the Payment Methods area, **Then** the list of existing methods with their type, title and active state is shown.
2. **Given** the creation form, **When** the operator changes the type, **Then** the form shows the banking fields appropriate to that type.
3. **Given** a method, **When** the operator toggles it inactive, **Then** it is no longer offered to clients while remaining visible/manageable in the admin.
4. **Given** a method, **When** the operator edits and saves, **Then** the changes persist across reloads.
5. **Given** a method, **When** the operator deletes it, **Then** it is removed from the list and no longer offered; appointments that already referenced it keep their captured payment details.
6. **Given** an invalid or incomplete method (for example missing title or required banking field), **When** saved, **Then** it is refused with a clear inline message and nothing is created.

---

### User Story 4 - The operator notifies the client through WhatsApp (Priority: P2)

After deciding on an appointment, the operator uses a **Notify** action that opens a WhatsApp chat addressed to the client's number with a pre-filled message containing the appointment details (service, date, time and deposit confirmation), so the client is informed without retyping.

**Why this priority**: Notification closes the loop with the client and is high value, but the booking and decision itself already work without it.

**Independent Test**: On an appointment detail, trigger Notify and confirm a WhatsApp chat opens for the client's number with a message that includes the service, date, time and deposit confirmation.

**Acceptance Scenarios**:

1. **Given** an appointment detail, **When** the operator activates Notify, **Then** a WhatsApp chat opens for the client's number with a pre-filled message including service, date, time and deposit confirmation.
2. **Given** the message, **When** it contains accented or special characters, **Then** they are preserved in the URL/message.
3. **Given** a client number that is not usable as a digits-only WhatsApp number, **When** the operator tries to notify, **Then** no chat opens and a clear message explains the number cannot be used.

---

### Edge Cases

- **Service does not require a deposit** → the payment step (method selection, reference, receipt) is not shown and the appointment is recorded without payment details.
- **No active payment methods configured** → the client cannot proceed past the payment step; a clear notice explains that payment methods are not available and directs the client to contact the studio.
- **Receipt upload fails** (network/size/format) → submission is refused, a visible error is shown, the rest of the entered data is preserved so the client can retry.
- **Reference left blank or whitespace** → submission refused with an inline message.
- **Receipt is not an image** (for example a PDF) → refused with a clear message.
- **Very large receipt image** → upload is refused with a clear message if it exceeds the allowed size, without breaking the flow.
- **Payment method deleted after an appointment used it** → the appointment keeps its captured method name, reference and receipt for audit; the detail view still renders them.
- **Payment method deactivated after an appointment used it** → the appointment is unaffected; only new client selections are restricted to active methods.
- **Two operators decide the same appointment at once** → the first decision wins; the second is rejected/ignored so the final state is consistent.
- **Appointment has no receipt** (for example manually created or a non-deposit service) → the detail view shows that no proof was provided and still allows approve/reject/notify.
- **Approve/reject while the receipt preview is open** → the action still applies to the correct appointment and the preview does not block it.
- **Long client names, titles or instructions** → wrap within their containers; no horizontal page scroll from 320px to 1920px.
- **Reduced-motion preference** → modal/detail and list transitions are suppressed.
- **Accented names, titles and instructions** → preserved intact in storage, in the admin detail and in WhatsApp messages.

## Requirements *(mandatory)*

### Functional Requirements

**Payment methods catalogue**

- **FR-001**: The system MUST let an authorized operator create a payment method with a type, a title, type-specific banking details, optional instructions and an active flag.
- **FR-002**: The supported method types MUST at least cover: mobile payment, crypto, Zelle, international transfer and cash.
- **FR-003**: The method form MUST show only the banking fields appropriate to the selected type (for example ID/tax number, phone and bank for mobile payment; Pay ID for crypto; email/account for Zelle/transfer).
- **FR-004**: The system MUST let an authorized operator edit, activate/deactivate and delete a payment method, and persist each change.
- **FR-005**: Deactivating a method MUST remove it from client selection while keeping it manageable in the admin; deleting a method MUST NOT alter or delete the payment details already captured on existing appointments.
- **FR-006**: The system MUST refuse to save a method missing required data (title and its type-required banking fields) with a clear inline message and no record created.
- **FR-007**: Active payment methods MUST be readable by the public booking flow; creating, editing, activating/deactivating and deleting MUST be restricted to authorized operators.

**Client deposit payment & proof step**

- **FR-008**: When the selected service requires a deposit, the booking flow MUST present, before final confirmation, the currently active payment methods for selection.
- **FR-009**: Selecting a payment method MUST display that method's banking details and its instructions.
- **FR-010**: The payment step MUST require the client to provide the chosen method, a reference number and an uploaded receipt image before submission.
- **FR-011**: The receipt MUST be uploaded to the studio's storage and the appointment MUST store a usable reference to the uploaded receipt.
- **FR-012**: On successful submission the appointment MUST be recorded with status **pending** and MUST carry the method, the captured method name, the reference and the receipt reference.
- **FR-013**: If the method, reference or receipt is missing or invalid, the system MUST refuse submission, create no appointment, and show a clear client-facing error while preserving already-entered data.
- **FR-014**: When the service does not require a deposit, the payment step MUST NOT be required and the appointment MUST be recorded without payment details.
- **FR-015**: A client with no authentication MUST be able to create an appointment with its payment details.

**Appointment detail review (admin)**

- **FR-016**: Selecting an appointment in the admin agenda MUST open a detail view.
- **FR-017**: The detail view MUST show the client's name, phone and email (when available).
- **FR-018**: The detail view MUST show the service, date, time and deposit amount.
- **FR-019**: The detail view MUST show, when present, the payment method used, the reference number and a preview that can be enlarged (lightbox) of the receipt image; when absent, it MUST state that no proof was provided.
- **FR-020**: The detail view MUST expose direct actions to approve, reject and notify for the appointment.
- **FR-021**: Approving MUST set the status to **confirmed**; rejecting MUST set the status to **rejected** and release the appointment's date/time; both MUST be recorded as state transitions (FR-024).
- **FR-022**: For an appointment already confirmed, rejected or completed, the approve/reject decisions MUST NOT be offered again.
- **FR-023**: Only authorized operators MUST be able to read payment details and change appointment status.

**Notifications & traceability**

- **FR-024**: Every appointment status change (for example pending → confirmed, pending → rejected) MUST be recorded as a transition that preserves the previous and new status, so the appointment's history is traceable.
- **FR-025**: The notification action MUST open a WhatsApp chat addressed to the client's number with a pre-filled message that includes, at minimum, the service, date, time and deposit confirmation.
- **FR-026**: When the client's number cannot be used as a digits-only WhatsApp number, the system MUST NOT open a chat and MUST inform the operator.

**Data & quality**

- **FR-027**: Payment methods and appointment payment details MUST persist durably in the production data source across sessions/restarts, with equivalent local/demo behavior and parity of semantics.
- **FR-028**: The change MUST NOT break existing booking, availability, or deposit-pricing behavior, MUST remain usable from 320px to 1920px with no horizontal page scroll and controls of at least 44×44px, MUST use only the project's design tokens, and the project's type-check gate and production build MUST pass with zero errors.

### Key Entities *(include if feature involves data)*

- **Payment method**: a way a client can pay the deposit — a type (mobile payment, crypto, Zelle, transfer, cash), a human-readable title, a set of type-specific banking details (for example ID/tax number, phone, bank, Pay ID, account holder), optional free-form instructions, an active flag and a creation time.
- **Appointment (booking)**: a client's booking for a service at a date and time, extended with payment support — the deposit amount owed, the selected payment method (reference and captured name), the payment reference, the receipt reference, and a status among pending, confirmed, rejected and completed.
- **Payment proof (receipt)**: the image the client uploads as evidence of the deposit, stored in the studio's storage and referenced from the appointment; viewable in the admin detail.
- **Status transition**: a recorded change of an appointment's status (previous status → new status) that provides the appointment's audit trail.
- **Notification message**: the pre-built, client-facing WhatsApp message generated for an appointment, containing the service, date, time and deposit confirmation while preserving accents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can create, edit, activate/deactivate and delete a payment method, and every change is reflected to clients within one page reload.
- **SC-002**: 100% of deposit-required appointments submitted through the client flow carry a payment method, a non-empty reference and a stored receipt; 0% of such appointments can be created without them.
- **SC-003**: An operator can open an appointment and see the client data, service/schedule, deposit amount, payment method, reference and an enlargeable receipt in a single view.
- **SC-004**: An operator can approve or reject an appointment and obtain a pre-filled WhatsApp notification in at most three actions from the agenda.
- **SC-005**: 100% of status changes are recorded as transitions with the correct previous and new status.
- **SC-006**: A date/time held by a pending or confirmed appointment is never simultaneously bookable by another client, and rejecting an appointment releases its date/time.
- **SC-007**: The admin payment area, the client payment step and the appointment detail are usable from 320px to 1920px with no horizontal page scroll, and all interactive controls measure at least 44×44px.
- **SC-008**: The project's type-check gate passes with zero errors, the production build succeeds, and unrelated routes/pages keep working.

## Assumptions

- **Terminology mapping (`appointments` ↔ `bookings`)**: the feature description refers to an `appointments` table; the repository's existing entity and table are named `bookings`. This feature extends the existing appointment/booking entity and its storage rather than introducing a parallel table, keeping the shared domain type in sync.
- **Status vocabulary**: the appointment lifecycle is represented by **pending**, **confirmed**, **rejected** and **completed**. The existing "cancelled" state is treated as the rejection of a request for the purposes of releasing the slot; any legacy-casing/vocabulary reconciliation is resolved in the data layer without inventing parallel states. Rejected and cancelled both release the date/time; completed does not.
- **Deposit amount**: consistent with the constitution, monetary amounts are held as integer cents end-to-end; the "deposit amount" field is the appointment's existing deposit expressed in the same integer-cents convention.
- **Receipt storage**: receipts are uploaded through the studio's existing image-storage capability and stored in a publicly readable location that the admin can display; a receipt is a single image.
- **Payment method types**: the exact label set is mobile payment, crypto (for example Binance/Pay ID), Zelle, international transfer and cash; the concrete banking fields are defined per type during planning, driven by the existing configuration placeholders for mobile payment and crypto.
- **Notification is manual**: approving, rejecting or changing an appointment makes the WhatsApp notification available; the operator opens it. No message is sent automatically.
- **Demo mode parity**: when no backend is configured, the same flows work with local persistence so the client step, the admin catalogue and the appointment detail behave identically.
- **Copy language**: public and admin copy is in Spanish.
- **Scope boundary**: the studio's WhatsApp number and the run-time banking values are configuration, not part of this feature's data model; this feature manages payment methods as data but does not perform any real payment processing.
- **Access model**: "authorized operator" means an authenticated studio admin, consistent with the existing admin area; the public has read-only access to active payment methods and create-only access for appointments with payment details.
