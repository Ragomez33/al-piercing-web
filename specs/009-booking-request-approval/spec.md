# Feature Specification: Booking Request Persistence & Admin Approval

**Feature Branch**: `009-booking-request-approval`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Ajusta el flujo de reservas y confirmación: (1) Al enviar el formulario público, guarda la cita en la tabla `bookings` mediante Supabase con estado `PENDING`, bloquea inmediatamente ese slot en la vista pública, muestra un modal de éxito ('Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad.') con un botón secundario que abra WhatsApp con un aviso preconstruido. (2) En `/admin`, muestra badges por estado (`PENDING` amarillo/naranja con botones Aprobar/Cancelar, `CONFIRMED` verde dorado, `CANCELLED` rojo/muted); la acción 'Aprobar Cita' actualiza el estado a `CONFIRMED` y genera un enlace de notificación por WhatsApp con mensaje de confirmación. Verifica con `astro check` que los tipos/interfaces de `Booking` sigan coincidiendo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The client submits a booking request and is reassured (Priority: P1)

A visitor completes the booking form (service, date, time, name, WhatsApp) and submits it. The system
records the request as **pending** and immediately holds that date/time for the client. Instead of being
thrown into WhatsApp, the client sees a success panel: *"Solicitud enviada con éxito. El estudio
verificará tu cupo a la brevedad."* On that panel there is a secondary action, *"Enviar comprobante /
aviso por WhatsApp"*, that opens a pre-filled WhatsApp chat so the client can proactively notify the
studio. The form is cleared and the slot no longer appears as available to that client.

**Why this priority**: This is the core trust moment of the flow — the client must know their request
was actually received and stored, not just pre-filled into a chat window. Without it, requests can be
lost and clients may believe they are booked when they are not.

**Independent Test**: Submit a valid booking request and confirm (a) a pending request exists in the
agenda, (b) the success panel with the exact reassurance copy is shown, (c) the WhatsApp notice action
opens a chat containing the request details, and (d) the chosen slot is no longer selectable for that
date.

**Acceptance Scenarios**:

1. **Given** a valid service/date/time/name/WhatsApp, **When** the client submits, **Then** a pending
   request is recorded and a success panel with the reassurance message is displayed.
2. **Given** a successful submission, **When** the success panel is shown, **Then** a secondary
   "Enviar comprobante / aviso por WhatsApp" action opens a WhatsApp chat pre-filled with the request
   details.
3. **Given** a successful submission, **When** the success panel is shown, **Then** the client form is
   cleared/reset and the submitted date/time is marked unavailable in the public availability view.
4. **Given** a submission in progress, **When** persistence has not completed, **Then** the submit
   control shows a busy state ("Procesando reserva…") and cannot be double-submitted.

---

### User Story 2 - The operator approves a pending request and notifies the client (Priority: P1)

An operator opens `/admin`, sees pending requests clearly distinguished, opens one, and approves it.
Approval marks the request **confirmed** and gives the operator a one-tap WhatsApp link with a
pre-built confirmation message addressed to the client, so the client is informed without retyping.

**Why this priority**: Approval is what turns a tentative request into a real appointment; without it
the stored requests have no operational outcome.

**Independent Test**: With a pending request in the agenda, approve it and confirm the status becomes
confirmed and a confirmation WhatsApp link/message is produced for that client.

**Acceptance Scenarios**:

1. **Given** a pending request, **When** the operator activates "Aprobar Cita", **Then** the request
   becomes confirmed and the agenda reflects the new state.
2. **Given** a request just approved, **When** approval completes, **Then** the operator is offered a
   WhatsApp link with a pre-built confirmation message to the client.
3. **Given** a pending request, **When** the operator activates "Cancelar", **Then** the request
   becomes cancelled and its date/time is released back to availability.
4. **Given** an already confirmed or cancelled request, **When** the operator opens it, **Then**
   approval is not offered again.

---

### User Story 3 - The operator scans appointments by status at a glance (Priority: P2)

While scanning the agenda, each appointment carries a status badge whose color communicates its state:
pending in amber/orange, confirmed in green-gold, cancelled in red/muted. Pending items expose inline
approve/cancel actions.

**Why this priority**: Color-coded status lets the operator triage the day quickly; it supports but is
secondary to the approve action itself.

**Independent Test**: Render appointments in all three states and confirm each badge shows the correct
label and distinct color, with approve/cancel actions present only for pending ones.

**Acceptance Scenarios**:

1. **Given** appointments in each state, **When** the agenda renders, **Then** pending is amber/orange,
   confirmed is green-gold, and cancelled is red/muted.
2. **Given** a pending appointment, **When** it renders, **Then** it exposes "Aprobar" and "Cancelar"
   actions.
3. **Given** confirmed or cancelled appointments, **When** they render, **Then** no approve action is
   shown.

### Edge Cases

- **Persistence fails on submit** → the process stops, no success panel is shown, no WhatsApp action is
  offered, and a visual error alert is presented to the client so they can retry.
- **Double submission** → a second submit while one is in flight is ignored; only one request is created.
- **Slot taken between selection and submit** → submission is rejected with a clear, client-facing
  message; the availability view refreshes and the taken slot is disabled.
- **WhatsApp number misconfigured** (“not digits only”) → no WhatsApp action is offered/opened; the
  success message still confirms the request was stored.
- **Backend not configured (demo mode)** → the same flow works with local persistence so the experience
  and copy are unchanged.
- **Operator approves/cancels the same request twice (race)** → the second action is rejected/ignored
  and the final state is consistent.
- **Cancelling frees the slot** → the released date/time becomes selectable again for other clients.
- **Accented names/services/notes** → preserved intact in the stored request and in every WhatsApp
  message.
- **Very long names/notes** → messages encode correctly; no horizontal page scroll at 320px.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On submit, the system MUST record the booking request with status **pending** before any
  WhatsApp step is offered.
- **FR-002**: While the request is being recorded, the submit control MUST show a busy state
  ("Procesando reserva…", or equivalent) and MUST reject additional submissions until it resolves.
- **FR-003**: On successful recording, the system MUST display a success panel with the exact
  reassurance copy: *"Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad."*
- **FR-004**: The success panel MUST offer a secondary action, labeled *"Enviar comprobante / aviso por
  WhatsApp"*, that opens a WhatsApp chat pre-filled with a notice referencing the just-submitted
  request ("acabo de solicitar una reserva…" plus service and date/time).
- **FR-005**: On successful recording, the submitted date/time MUST be immediately marked unavailable in
  the public availability view without requiring a full page reload.
- **FR-006**: On successful recording, the client form MUST be cleared/reset so the client cannot
  accidentally resubmit the same data.
- **FR-007**: If recording fails, the system MUST stop the flow, MUST NOT offer or open WhatsApp, and
  MUST show a visible client-facing error alert.
- **FR-008**: The admin agenda MUST render each appointment with a status badge: pending = amber/orange,
  confirmed = green-gold, cancelled = red/muted, each with a readable status label.
- **FR-009**: Pending appointments MUST expose "Aprobar" and "Cancelar" actions; confirmed and cancelled
  appointments MUST NOT expose "Aprobar".
- **FR-010**: "Aprobar" MUST set the request status to **confirmed** and refresh the agenda to the new
  state.
- **FR-011**: Completing an approval MUST produce a WhatsApp link with a pre-built confirmation message
  for the client (service, date, time) that the operator can open.
- **FR-012**: "Cancelar" MUST set the request status to **cancelled** and release its date/time back to
  public availability.
- **FR-013**: Public availability MUST treat pending and confirmed requests (plus manual blocks) as
  occupying a date/time; cancelled requests MUST NOT occupy it.
- **FR-014**: The flow MUST behave identically in demo mode (local persistence) and production, including
  the success panel, the WhatsApp notice action and the admin approval outcome.
- **FR-015**: All WhatsApp messages MUST preserve accented and special characters.
- **FR-016**: All new UI MUST consume the project's design tokens exclusively and remain usable from
  320px to 1920px with no horizontal page scroll.

### Key Entities *(include if feature involves data)*

- **Booking (request)**: a client's appointment intent — client name, client WhatsApp, service
  (id/name), date, time, total price and deposit (integer cents), optional notes, current status
  (pending / confirmed / cancelled) and creation time.
- **Availability slot**: a date/time whose selectability is derived from active requests (pending +
  confirmed) and manual unavailability blocks; cancelled requests release it.
- **Status badge**: the visual, color-coded representation of a booking's state, with state-dependent
  actions.
- **WhatsApp notice / confirmation message**: a pre-built client-facing message (notice after submit,
  confirmation after approval) containing service and date/time and preserving accents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A client can complete and submit a booking request and see the success reassurance in
  under 60 seconds from opening the form.
- **SC-002**: 100% of successful submissions are recorded before any WhatsApp action is offered; on
  failure, 0% of cases open WhatsApp and 100% show a visible error.
- **SC-003**: A date/time held by a pending or confirmed request is never simultaneously selectable by
  another client (zero double-bookings in acceptance testing).
- **SC-004**: An operator can approve a pending request and obtain the client confirmation link in at
  most two actions from the agenda.
- **SC-005**: An operator can distinguish pending, confirmed and cancelled appointments by color alone
  in a visual scan of the agenda.
- **SC-006**: The project's type-check gate passes with zero errors after the change, with the booking
  domain types/interfaces remaining consistent across the data layer and UI.

## Assumptions

- **Slot-hold policy**: A pending *request* temporarily holds its date/time in the public availability
  view (consistent with the existing availability behavior, which already counts pending + confirmed).
  This is distinct from a pending *deposit*: the studio's deposit validation remains a separate concern.
  ⚠️ Governance note: the repo constitution (§IV) states that "pending deposits never block a slot"; this
  feature's "pending request holds the slot" interpretation should be confirmed/ratified during planning
  and, if accepted, reflected in the constitution/design notes.
- The success panel **replaces** the current behavior of auto-opening WhatsApp on submit; WhatsApp becomes
  a deliberate secondary action on the success panel.
- The WhatsApp messages are courtesy notices/confirmations; the studio still validates the slot manually.
- Sending the confirmation message is manual — approval generates the link and the operator opens it.
- The studio WhatsApp number is configured before launch (digits only with country code); demo ships a
  placeholder.
- Demo mode (no backend configured) must reproduce the same experience using local persistence.
- The `Booking` domain type already models id, timestamps, client data, service, integer-cent price and
  deposit, date, time, status and optional notes; this feature extends its *usage* (status-driven UI,
  approval) without inventing parallel types.
- Public/admin copy is in Spanish.
- Service prices and deposits are stored and computed as integer cents and displayed in USD with two
  decimals.
- The existing admin calendar (feature 006) is the surface for the approval actions; this feature refines
  its badges/actions rather than replacing the calendar.
