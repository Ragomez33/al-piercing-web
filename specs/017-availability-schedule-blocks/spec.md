# Feature Specification: Disponibilidad, Horarios Laborales y Bloqueos Avanzados

**Feature Branch**: `017-availability-schedule-blocks`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Implementa el sistema robusto de gestión de disponibilidad, horarios laborales y bloqueos avanzados para ALPIERCING: 1. Base de Datos y Migración (supabase/migrations/0008_availability_blocks.sql): asegura o expande la tabla de bloqueos (blocked_slots o similar) para soportar rangos: start_datetime (timestamptz), end_datetime (timestamptz), reason (text), is_full_day (boolean); crea una tabla o configuración de horarios base del estudio (studio_schedule) con días de la semana, hora de apertura y hora de cierre; configura RLS y políticas para que solo los administradores puedan crear/eliminar bloqueos y horarios, mientras que el público pueda consultarlos (SELECT). 2. Módulo de Gestión en el Panel Admin (AdminPanel.svelte - Pestaña Horarios/Bloqueos): permite al admin configurar los días laborables y el horario general de atención; permite crear bloqueos avanzados (rango de horas: fecha, hora inicio y fin; rango de días completos: fecha inicio y fin); muestra la lista de bloqueos activos con opción de eliminarlos con UX libre de flicker. 3. Validación Estricta en el Motor de Reservas (BookingFlow.svelte y lógica de slots): actualiza el generador de turnos/slots disponibles para que cruce la disponibilidad contra: 1) las citas ya existentes en la BD; 2) los bloqueos por rango de horas o días completos; si un cliente intenta reservar en un horario bloqueado, el sistema bloquea la acción y muestra un mensaje explicativo ('Este horario ya no se encuentra disponible'). 4. Tiempo Real (Realtime Sync): conecta las tablas de bloqueos y citas al canal de realtime.ts para que cualquier cambio hecho en el admin se sincronice al instante en la PWA del cliente. Ejecuta npx astro check y npm run build al finalizar para garantizar cero errores de compilación."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure the studio's working hours (Priority: P1)

A studio operator opens the admin's schedule/blocks area and defines the studio's regular weekly opening pattern: which weekdays are worked and, for each working day, the opening and closing time. The configuration is saved and survives reloads. From that moment, the public booking calendar only proposes times that fall inside the studio's declared working hours on working days.

**Why this priority**: The working schedule is the base layer of availability; without it there is no ground truth for what "open" means and every later blocking rule builds on top of it.

**Independent Test**: Set the working days and opening/closing times, save, reload the admin and confirm the saved pattern is shown; open the public booking page and confirm only in-hours times on working days are offered.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they open the schedule area, **Then** the current working days and the opening/closing times per working day are shown.
2. **Given** the schedule editor, **When** the operator marks/unmarks weekdays and sets valid opening/closing times, **Then** the configuration is saved and persists across reloads.
3. **Given** a saved schedule, **When** a visitor opens the booking page, **Then** days that are not working days show no bookable times, and working days only offer times between opening and closing.
4. **Given** an invalid entry (closing time not after opening time, or no working day selected), **When** the operator tries to save, **Then** the save is refused with a clear inline message and the previous configuration stays intact.

---

### User Story 2 - Create and manage advanced blocks (Priority: P1)

An operator needs to close availability beyond the regular schedule — a one-off afternoon, a full day, or a multi-day holiday. From the same admin area they can create a block in two modes: a **time range** (a date plus a start and end time) and a **full-day range** (a start date and an end date). The list of active blocks is shown; deleting one removes it from the list and frees its time immediately, without the list flashing or blanking.

**Why this priority**: Blocks are the day-to-day tool an operator uses to keep the public agenda truthful (lunches, personal time, holidays, external events).

**Independent Test**: Create a time-range block and a full-day-range block, confirm both appear in the list; delete one and confirm the list updates in place without a full reload or flicker.

**Acceptance Scenarios**:

1. **Given** the block manager, **When** the operator chooses "time range", picks a date, a start time and an end time and saves, **Then** the block appears in the active list with its range and reason.
2. **Given** the block manager, **When** the operator chooses "full-day range", picks a start date and an end date and saves, **Then** the block covers every whole day between the two dates inclusive and appears in the active list.
3. **Given** an active block, **When** the operator deletes it and confirms, **Then** the block disappears from the list in place with no blanking/flicker and its time becomes bookable again immediately.
4. **Given** invalid input (end not after start), **When** the operator tries to save, **Then** the block is refused with a clear inline message and no record is created.
5. **Given** a failed create or delete, **When** the data layer rejects it, **Then** the previous list stays visible and an inline error is shown.

---

### User Story 3 - Only genuinely free times can be booked (Priority: P1)

A visitor uses the public booking flow and is offered only times that are actually free. A time is offered only when it is inside the studio's working hours on a working day, is not already taken by another non-cancelled appointment, and is not covered by a time-range or full-day block. If the visitor tries to submit a time that has just become unavailable (for example a block was added or another booking landed first), the booking is refused and a clear message — "Este horario ya no se encuentra disponible" — explains why.

**Why this priority**: This is the correctness guarantee the studio depends on; it directly prevents double-booking and booking into closed/blocked time.

**Independent Test**: Seed an appointment, a time-range block and a full-day block; open the booking flow and confirm none of the occupied, blocked or out-of-hours times are offered; attempt to submit an unavailable time and confirm the refusal message.

**Acceptance Scenarios**:

1. **Given** a date with existing non-cancelled appointments, **When** the visitor opens that date, **Then** every already-taken time is excluded from the offered slots.
2. **Given** a time-range block on a working day, **When** the visitor opens that date, **Then** all times inside the block are excluded while the remaining free times are still offered.
3. **Given** a full-day block, **When** the visitor opens any date covered by it, **Then** the day offers no bookable times.
4. **Given** a time that is out of hours or on a non-working day, **When** it would otherwise appear, **Then** it is not offered and cannot be submitted.
5. **Given** a visitor submits a time that became unavailable while they were deciding, **When** they confirm the booking, **Then** the action is blocked, no appointment is created, and "Este horario ya no se encuentra disponible" is shown.
6. **Given** a cancelled appointment, **When** the visitor opens its date, **Then** its former time is offered again.

---

### User Story 4 - Availability updates live on the open client page (Priority: P2)

While a visitor has the booking flow open, the operator creates or removes blocks or an appointment is added/approved/cancelled; the open page's offered times refresh by themselves so the visitor never sees a stale agenda. If the live mechanism is unavailable, the page keeps the last known availability and stays usable.

**Why this priority**: It removes the most common cause of failed attempts (stale availability) but the flow remains correct without it because submission is re-validated server-side.

**Independent Test**: With the booking flow open, create/extend/delete a block and add/cancel an appointment from the admin and confirm the offered times change without a manual reload and without scroll jump.

**Acceptance Scenarios**:

1. **Given** an open booking flow, **When** the operator creates a time-range or full-day block, **Then** the affected times disappear from the open page without a manual reload.
2. **Given** an open booking flow, **When** the operator deletes a block, **Then** the freed times appear without a manual reload.
3. **Given** an open booking flow, **When** an appointment is created, approved or cancelled, **Then** the affected times update without a manual reload.
4. **Given** the live mechanism unavailable, **When** availability cannot refresh live, **Then** the page keeps the last known availability and the submit guard still prevents booking an unavailable time.

---

### Edge Cases

- **Full-day range where start date equals end date** → exactly that single day is blocked.
- **End earlier than start** (time range or day range) → refused with a clear validation message; nothing is saved.
- **Block that starts before opening or ends after closing** → still blocks its real interval; times outside working hours are not offered anyway.
- **Block spanning midnight / overnight** → the covered interval is respected exactly as declared (an overnight block covers both calendar days it touches).
- **Block covering a day that is not a working day** → valid to create; it simply has no visible effect until/unless that day becomes a working day.
- **Two or more overlapping blocks** → allowed; their union is blocked and each is listed and independently deletable.
- **Block created over an existing non-cancelled appointment** → the block is saved and the operator is warned that it collides with an existing appointment; existing appointments are never silently cancelled.
- **Deleted block** → its time becomes bookable again immediately on the next availability read.
- **No working days configured / no schedule row saved** → the calendar offers no times (fail closed) and the booking page shows a clear notice instead of a broken picker.
- **Visitor and admin time zones differ / daylight-saving change** → availability is computed in the studio's local time so opening/closing and blocks are interpreted consistently for every visitor.
- **Two visitors submit the same free slot at once** → slot exclusivity is preserved: at most one appointment is created and the other is refused with "Este horario ya no se encuentra disponible".
- **Block or schedule change while a visitor is mid-submit** → submission re-validates against the latest availability and refuses if the slot is no longer free.
- **Invalid time format or missing required field** in a block/schedule form → refused with an inline message; no partial record.
- **Long reason text** → wraps within its container without breaking the list layout.
- **Reduced-motion preference** → list/entry transitions are suppressed; the list never flashes on mutation.

## Requirements *(mandatory)*

### Functional Requirements

**Studio schedule (working hours)**

- **FR-001**: The system MUST let an authorized operator define the studio's regular weekly working pattern: which weekdays are working days and, for each working day, an opening time and a closing time.
- **FR-002**: The system MUST persist the schedule so it survives reloads and is used consistently by every booking session.
- **FR-003**: The system MUST reject a schedule whose closing time is not strictly after its opening time, or that has no working day selected, showing a clear inline message and keeping the previous configuration.
- **FR-004**: When no schedule is configured, the system MUST fail closed (offer no bookable times) and show a clear notice rather than failing or offering times outside any declared hours.

**Advanced blocks**

- **FR-005**: The system MUST let an authorized operator create a block as either a **time range** (a date plus a start time and an end time) or a **full-day range** (a start date and an end date), with an optional reason.
- **FR-006**: A time-range block MUST cover exactly the declared interval; a full-day-range block MUST cover every whole day from its start date to its end date inclusive (a single day when both dates are equal).
- **FR-007**: The system MUST reject a block whose end is not strictly after its start, or that is missing a required field, showing a clear inline message and creating no record.
- **FR-008**: The system MUST list all active blocks (range and reason) and MUST allow the operator to delete any one of them.
- **FR-009**: The system MUST allow overlapping blocks; each remains listed and independently deletable, and their combined interval is treated as blocked.
- **FR-010**: Creating or deleting a block MUST update the admin list in place with a per-entry busy state and MUST NOT blank, flash or fully tear down the surrounding list; a failed mutation MUST keep the previous list and show an inline error (flicker-free UX).
- **FR-011**: When a new block would collide with an existing non-cancelled appointment, the system MUST warn the operator and still save the block, and MUST NOT silently cancel any existing appointment.

**Availability & booking enforcement**

- **FR-012**: The offered times for a date MUST be computed by intersecting, at minimum: (a) the studio's working days and opening/closing hours, (b) every non-cancelled existing appointment on that date, and (c) every time-range and full-day block that covers that date.
- **FR-013**: A time covered by an existing non-cancelled appointment, by a block, or falling outside working hours, MUST NOT be offered as bookable.
- **FR-014**: When a visitor attempts to submit a booking for a time that is no longer available, the system MUST block the action, create no appointment, and show the message "Este horario ya no se encuentra disponible".
- **FR-015**: Slot exclusivity MUST hold under concurrency: when two bookings target the same slot, at most one MUST be created and the other MUST be refused with the same explanatory message.
- **FR-016**: Cancelling an appointment MUST release its time so it becomes bookable again, consistent with existing booking-integrity rules.

**Admin experience & access**

- **FR-017**: The admin MUST expose a schedule-and-blocks area (a dedicated tab) alongside the existing sections, reachable by its tab address.
- **FR-018**: Only authorized operators MUST be able to create, modify or delete blocks and the schedule; unauthenticated/visitor access MUST be read-only for these.

**Live updates**

- **FR-019**: While a client has the booking flow open, changes made by the operator to blocks and to appointments MUST be reflected in the offered times without a manual reload, using the site's existing change-notification capability; when it is unavailable the page MUST keep the last known availability and remain usable.

**Data & quality**

- **FR-020**: Blocks and the schedule MUST persist durably in the production data source across sessions and restarts, and MUST have an equivalent local/demo behavior with parity of semantics.
- **FR-021**: Public read access to blocks and the schedule MUST be available (so the public agenda can honour them) while all writes MUST be restricted to authorized operators.
- **FR-022**: The change MUST NOT alter payment/deposit semantics or unrelated routes, MUST remain responsive from 320px to 1920px with no horizontal page scroll and controls of at least 44×44px, MUST use only the project's design tokens, and the project's type-check gate and production build MUST pass with zero errors.

### Key Entities *(include if feature involves data)*

- **Studio schedule**: the studio's regular weekly availability — for each weekday, whether it is a working day and, when it is, the opening and closing times. Single source of truth for "what hours are normally open".
- **Availability block**: a manually declared unavailability interval — a start instant, an end instant, an optional reason and a flag distinguishing a partial-day time range from a full-day range. Covers ranges rather than a single fixed slot.
- **Appointment (existing)**: a client booking with a date and time; only non-cancelled appointments remove availability, and cancellation restores it.
- **Derived slot availability**: the computed set of bookable times for a date, obtained by intersecting the schedule, existing appointments and blocks. Client-visible; not persisted.
- **Admin list entry state**: the per-entry idle/busy/error state kept while a block mutation is pending, mirroring the existing admin list-state pattern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of offered public slots on any date fall inside the studio's configured working hours and are free of both existing non-cancelled appointments and any covering block (0 double-bookings and 0 bookings into blocked time).
- **SC-002**: An operator can configure the weekly working hours and create a time-range and a full-day-range block in under 2 minutes, and each action is reflected in the open public agenda within 5 seconds without a manual reload.
- **SC-003**: 100% of attempts to submit an unavailable time are blocked with the message "Este horario ya no se encuentra disponible" and create no appointment.
- **SC-004**: During any admin block create/delete the list never renders a blank/empty frame and no visible full-list flicker occurs; failed mutations leave the previous list intact.
- **SC-005**: With no schedule configured, the booking page offers 0 bookable times and shows a clear notice instead of erroring or offering out-of-hours times.
- **SC-006**: The schedule-and-blocks admin area and the public booking flow are usable from 320px to 1920px with no horizontal page scroll, and all interactive controls measure at least 44×44px.
- **SC-007**: The project's type-check gate passes with zero errors, the production build succeeds, and unrelated routes/pages keep working.

## Assumptions

- **Schedule granularity**: the schedule is a weekly pattern (one opening/closing pair per working weekday); per-date exceptions are expressed as full-day or time-range blocks rather than as schedule overrides.
- **Slot granularity unchanged**: the existing booking time-step/granularity is preserved; this feature changes which of those times are offered, not the size of the step.
- **Studio-local time**: availability is computed in the studio's local time so opening/closing, blocks and appointments are interpreted consistently regardless of the visitor's device time zone.
- **Blocks supersede fixed-slot blocks**: the previous per-slot unavailability model is superseded by the range-based block model; existing behaviour (public agenda hides unavailable times) is preserved and any pre-existing block data is represented as ranges.
- **Migration numbering**: this work continues the repository's numbered schema-change workflow (`0008`) and keeps the shared type/entity contracts in sync.
- **Admins only**: "authorized operator" means an authenticated studio admin, consistent with the existing admin area; the public has read-only access to availability.
- **Existing appointments are not auto-cancelled**: creating a block that overlaps existing appointments warns the operator but never mutates those appointments; resolving real conflicts is a manual decision.
- **Fail-closed on unknown schedule**: absence of a saved schedule means the studio is treated as unavailable, not as always-open.
- **Realtime scope**: consistent with the existing capability — changes made through the admin appear on open client pages without a manual reload; cross-device delivery is available only where the underlying infrastructure supports it, and submission is always re-validated regardless.
- **Copy**: public and admin copy is in Spanish, following existing conventions.
- **No payment impact**: no monetary, deposit or pricing behaviour is touched by this module.
