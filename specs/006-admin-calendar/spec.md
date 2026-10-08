# Feature Specification: Interactive Admin Calendar

**Feature Branch**: `006-admin-calendar`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implementa un componente de Calendario Grande e Interactivo para la gestión de la agenda del administrador (`/admin?tab=calendar`). (1) Vista Semanal/Diaria por horarios: eje vertical con horas (09:00–19:00) y eje horizontal con días; cada reserva se renderiza como bloque proporcional a su duración (30/45 min); tarjetas `CONFIRMED` con fondo `#1A1A1E` y borde dorado `#E5A93C`, `PENDING` translúcidas; muestra Hora, Nombre del cliente y Perforación. (2) Modal al hacer clic con datos completos (WhatsApp, servicio, precio total, seña abonada, saldo) y botones `[Confirmar Seña]`, `[Reagendar]`, `[Cancelar Cita]`; clic en espacio libre crea un `Bloqueo` (ej. 'Almuerzo'/'Personal') que deshabilita el slot en el formulario público. (3) Paleta Dark/Gold (`#111113`/`#1A1A1E`/`#E5A93C`) con divisores sutiles (`rgba(255,255,255,0.05)`). `npx astro check` sin errores."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator reads the week at a glance (Priority: P1)

The operator opens the admin calendar and sees the week laid out as a time × day grid. Every
appointment appears as a block sized to its duration, visually distinguishing confirmed (solid dark
card, gold border) from pending-deposit bookings (translucent). Each block shows the start time, the
client name and the piercing service, so a full week can be read without opening each row.

**Why this priority**: The calendar is the new primary agenda view and replaces the flat list; the
core value is reading and validating the week visually.

**Independent Test**: Open `/admin?tab=calendar` with bookings → blocks appear in the correct day
column and time position with the right size, color rules and label; confirmed vs pending styles
differ.

**Acceptance Scenarios**:

1. **Given** bookings for the week, **When** the operator opens the calendar, **Then** each booking
   renders in the correct day/time cell sized proportionally to its duration.
2. **Given** a confirmed booking, **When** the calendar renders, **Then** its card uses the solid
   dark surface with a gold border.
3. **Given** a pending booking, **When** the calendar renders, **Then** its card uses a translucent
   style.
4. **Given** any appointment card, **When** the operator reads it, **Then** it shows the start time,
   the client name and the piercing service.

---

### User Story 2 - Operator opens an appointment and acts on it (Priority: P2)

Clicking an appointment block opens a detail modal with the client's full data (WhatsApp/phone,
service, total price, deposit paid and balance due at the studio). From there the operator can
`[Confirmar Seña]`, `[Reagendar]` (change date/time) or `[Cancelar Cita]`, and the calendar updates
immediately.

**Why this priority**: Acting on individual appointments is the operational need, building on the
visual calendar.

**Independent Test**: Click a confirmed/pending booking → modal shows contact + financial breakdown;
confirm, reschedule to a free slot, and cancel; each action updates the calendar and persists.

**Acceptance Scenarios**:

1. **Given** an appointment block, **When** the operator clicks it, **Then** a modal shows the
   client contact, service, total price, deposit paid and pending balance.
2. **Given** the modal, **When** the operator confirms the seña, **Then** the booking becomes
   `CONFIRMED` and the calendar updates its style.
3. **Given** the modal, **When** the operator reschedules to a free date/time, **Then** the booking
   moves on the calendar and is persisted.
4. **Given** the modal, **When** the operator cancels the appointment, **Then** the booking becomes
   `CANCELLED` and leaves the calendar grid.

---

### User Story 3 - Operator blocks time manually (Priority: P3)

The operator clicks any free space in the grid and creates a manual block (with a label like
"Almuerzo" or "Personal", and a duration). Blocked slots no longer appear as bookable in the public
booking screen, so clients cannot pick an unavailable moment.

**Why this priority**: Manual blocking protects the real agenda, but it is secondary to visualizing
and acting on bookings.

**Independent Test**: Click a free cell, create a block with a label/duration → it appears on the
calendar and the same date/time is disabled in the public booking form.

**Acceptance Scenarios**:

1. **Given** an empty grid cell, **When** the operator clicks it and confirms a block, **Then** a
   labeled block appears on the calendar for its duration.
2. **Given** an existing block, **When** a client opens booking for that date, **Then** the blocked
   time cannot be selected.
3. **Given** an occupied cell, **When** the operator tries to block it, **Then** the system rejects
   it (a booking already holds the slot).

### Edge Cases

- What happens when two bookings attempt the same slot? The date+time slot stays exclusive for
  active bookings plus blocks; the second cannot be created/moved there.
- What happens when an appointment duration exceeds the remaining opening hours? The card is clipped
  at the grid edge (never overflows); the operator is expected to reschedule.
- What happens when rescheduling into an occupied or blocked slot? The action is rejected with a
  clear message.
- What happens when the operator cancels a booking? Its block/space is released and free for reuse.
- What happens when the week is navigated (previous/next)? The grid reloads that week from the data.
- What happens on a small screen (≈320px)? The calendar degrades to a scrollable grid (horizontal
  scroll inside the calendar container only, never the page) and the modal stays usable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin must expose a **Calendario** tab at `/admin?tab=calendar` that replaces the
  flat bookings list as the agenda view.
- **FR-002**: The calendar MUST render a weekly grid: vertical time axis and one column per day of
  the week, with previous/next week navigation.
- **FR-003**: Each appointment MUST render as a block sized proportionally to its duration, placed at
  its date/time.
- **FR-004**: A `CONFIRMED` appointment MUST use a solid dark card with a gold border; a `PENDING`
  appointment MUST use a translucent card.
- **FR-005**: Every appointment card MUST show the start time, the client name and the service name.
- **FR-006**: Clicking an appointment MUST open a detail dialog showing WhatsApp/contact, service,
  total price, deposit paid and the pending balance to collect at the studio.
- **FR-007**: The dialog MUST offer `[Confirmar Seña]` (→ `CONFIRMED`), `[Reagendar]` (change
  date/time to a free slot) and `[Cancelar Cita]` (→ `CANCELLED`), and the calendar MUST update after
  each action.
- **FR-008**: Clicking a free grid cell MUST allow the operator to create a manual time block with a
  label (e.g. "Almuerzo", "Personal") and a duration.
- **FR-009**: An occupied cell MUST NOT accept a manual block; the system MUST reject it.
- **FR-010**: Blocked times MUST be excluded from the public booking availability for the same
  date, together with active bookings.
- **FR-011**: Appointments and blocks MUST persist in the active data mode (demo or production).
- **FR-012**: The calendar MUST use the project's Dark/Gold tokens, with subtle dividers
  (`rgba(255, 255, 255, 0.05)`) and no horizontal page scroll at any viewport.
- **FR-013**: The project MUST build and type-check with zero errors and zero warnings.

### Key Entities *(include if feature involves data)*

- **CalendarEvent**: a visual appointment block — date, start time, duration (from the service),
  client, service and status.
- **TimeBlock**: a manual unavailability — date, start time, duration and label (e.g. "Almuerzo").
- **Booking** *(existing)*: drives CalendarEvent; its status/count/shifts are managed from the dialog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can identify a booking's time, client, service and status from the calendar
  without opening it (visual scan).
- **SC-002**: Confirming, rescheduling or cancelling a booking takes at most 3 actions from the
  calendar.
- **SC-003**: A manually blocked slot never appears as selectable in the public booking screen.
- **SC-004**: The calendar renders a week with no layout breakage at 320px–1920px (calendar scrolls
  internally only).
- **SC-005**: The build and type-check gates finish with zero errors and zero warnings.

## Assumptions

- The calendar **replaces** the flat bookings list (`tab=calendar` becomes the agenda view; the old
  list view is removed).
- Week starts on **Monday**; the grid covers **09:00–19:30** (the full public bookable window, so no
  slot is clipped below the 19:30 booking slots).
- Appointment duration comes from the associated piercing service (`durationMinutes`).
- Manual blocks default to **30 minutes** with an editable duration (15/30/60/90/120) and a label.
- Rescheduling validates the target date/time against active bookings and blocks (slot exclusivity).
- Clicking an occupied cell opens the appointment modal; clicking a free cell offers block creation.
- The feature operates under the admin login (feature 005): no calendar data is shown without a
  session, and writes keep the authenticated/RLS setup.
- Demo mode persists events/blocks in the browser; production uses Supabase (new `time_blocks` table).