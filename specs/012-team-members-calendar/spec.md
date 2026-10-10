# Feature Specification: Team Members Module, Monthly Admin Calendar & Mobile UX

**Feature Branch**: `012-team-members-calendar`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Añadir un módulo de Equipo/Staff (spec + migración, CRUD en la capa de datos, sección Dark Luxury 'Nuestro Equipo / Artistas' en la landing y gestión con subida de avatar en el panel admin), rediseñar el calendario de admin a una vista mensual interactiva con detalle del día (desktop) y selector de días + lista vertical (mobile <768px), y corregir el layout/UI móvil (menú hamburguesa en el header, paddings y desbordamientos en catálogo, carrito y checkout de reserva)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The studio's artists are shown on the public landing (Priority: P1)

A visitor scrolls the landing page and finds a "Nuestro Equipo / Artistas" section that introduces the
studio's team. Each artist appears with their photo (or an elegant placeholder), name, role, a short
biography and, when available, a link to their Instagram profile. The section reflects whatever the
studio has published.

**Why this priority**: This is the client-facing half of the new team capability and the main visible
value for the brand; without it the team data has no audience.

**Independent Test**: With active team members present in the data source, open `/` and confirm the team
section renders each member's name, role, photo, bio and Instagram link; with none present, confirm the
section is hidden without breaking the page.

**Acceptance Scenarios**:

1. **Given** active team members exist, **When** a visitor opens the landing page, **Then** a "Nuestro
   Equipo" section lists them with name, role, avatar (placeholder when missing) and bio.
2. **Given** a member has an Instagram handle, **When** the section renders, **Then** a link to that
   profile is shown that opens in a new tab.
3. **Given** a member is inactive, **When** the landing page renders, **Then** that member is not shown.
4. **Given** there are no active members, **When** the landing page renders, **Then** the team section is
   not shown (or shows an elegant empty state) and the rest of the page is unaffected.

---

### User Story 2 - The operator manages the team roster (Priority: P1)

An authenticated operator opens `/admin` and finds an "Equipo" section alongside Calendario, Inventario
and Servicios. There they see every member (active and inactive), create a new member, edit an existing
one (name, role, avatar, bio, Instagram handle), activate/deactivate a member for the public site, and
delete members they no longer work with.

**Why this priority**: The public section is only useful if the studio can maintain it without a code
change or redeploy; it is the operator-facing half of the same capability.

**Independent Test**: Sign in, open Equipo, create a member with an avatar, edit their role/bio,
deactivate them, and confirm the changes persist after a reload and that the public section reflects them.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they open the admin Equipo section, **Then** they see the
   current roster with each member's role and active state.
2. **Given** the Equipo section, **When** the operator creates a member with valid data and an avatar,
   **Then** the member is persisted and appears in the list.
3. **Given** an existing member, **When** the operator edits their fields, **Then** the changes persist and
   are reflected in the public team section.
4. **Given** an existing member, **When** the operator deactivates them, **Then** they are hidden from the
   public section but remain visible (marked inactive) in admin.
5. **Given** an existing member, **When** the operator deletes them, **Then** they are removed from admin
   and the public section.
6. **Given** invalid input (empty name or role), **When** the operator submits, **Then** a clear validation
   message is shown and nothing is persisted.

---

### User Story 3 - The operator reviews the month on desktop (Priority: P2)

An authenticated operator opens the Calendario section on a desktop screen and sees a monthly grid. Each
day shows an indicator of how many appointments it holds and their overall status, so the operator can
scan the whole month at a glance. Clicking a day opens that day's appointments with their actions.

**Why this priority**: A monthly overview materially improves scheduling decisions versus the previous
week-only view, but it is an enhancement to an existing, already-working capability.

**Independent Test**: Open Calendario on a wide screen, confirm the monthly grid with per-day appointment
indicators, click a day and confirm its appointments list with working approve/cancel/reschedule actions.

**Acceptance Scenarios**:

1. **Given** at least one appointment in the current month, **When** the operator opens Calendario on
   desktop, **Then** a monthly grid is shown with an indicator on each day that has appointments.
2. **Given** the monthly grid, **When** the operator clicks a day, **Then** that day's appointments are
   listed with client, service, time and status.
3. **Given** a pending appointment in the day detail, **When** the operator approves, cancels or
   reschedules it, **Then** the change is persisted and the month indicator updates accordingly.
4. **Given** the operator navigates to the previous/next month, **When** the grid reloads, **Then** the
   indicators reflect that month's appointments.

---

### User Story 4 - The operator reviews the calendar on mobile (Priority: P2)

An authenticated operator opens the Calendario section on a phone (narrower than 768px). Instead of a wide
grid, they get a horizontally scrollable day selector for the month and, below it, a vertical list of the
selected day's appointments with a clear breakdown of the requested service.

**Why this priority**: The previous week grid overflowed on small screens; a mobile-specific layout makes
the calendar usable on the phone the operator actually carries, but it depends on the same data as US3.

**Independent Test**: Open Calendario at a 360px width, use the day selector to move between days, and
confirm the vertical list shows the selected day's appointments with service details and no horizontal
scrolling.

**Acceptance Scenarios**:

1. **Given** a phone-width viewport, **When** the operator opens Calendario, **Then** a horizontal day
   selector is shown and a vertical appointment list for the selected (default: today/current day) renders
   below without horizontal page scroll.
2. **Given** the mobile calendar, **When** the operator selects another day, **Then** the vertical list
   updates to that day's appointments.
3. **Given** an appointment in the mobile list, **When** the operator opens it, **Then** the service,
   time, client and status are legible and the approve/cancel/reschedule actions are available.

---

### User Story 5 - The public site is comfortable on small screens (Priority: P3)

A visitor on a phone can open and close the site's main navigation with a smooth hamburger menu, and can
browse the catalog, open the cart and reach the booking checkout without any horizontal scrolling or
awkward paddings.

**Why this priority**: These are polish/hardening fixes that protect the experience at small widths; they
improve every journey but are not a new capability.

**Independent Test**: At 320–414px width and on the public header, open/close the mobile menu; then visit
`/catalog`, open the cart drawer and reach `/booking`'s submit step and confirm no horizontal scroll and
comfortable touch targets.

**Acceptance Scenarios**:

1. **Given** a phone-width viewport on any public page, **When** the visitor taps the hamburger, **Then** a
   navigation menu opens smoothly and closes via its control, Escape or selecting a link, with focus
   handled sensibly.
2. **Given** a 320px-wide viewport, **When** the visitor browses `/catalog`, **Then** the product grid, the
   cart drawer and its line items do not overflow horizontally.
3. **Given** a 320px-wide viewport, **When** the visitor reaches `/booking`'s checkout, **Then** the form,
   deposit summary and submit button stay within the viewport with no horizontal scroll.

---

### Edge Cases

- **Empty team** → the public section is hidden or shows an elegant empty state; admin shows an empty state.
- **Missing or broken avatar** → an elegant placeholder is shown; the card layout does not break.
- **Very long name, role or bio** → text wraps within the card and the page never scrolls horizontally.
- **Empty Instagram handle** → no link is rendered; an invalid handle does not produce a broken link.
- **Deactivating/deleting a member** → hidden/removed from the public section but the operation is
  reversible (deactivate) or clearly confirmed (delete) in admin.
- **Backend not configured or a read/write fails** → the app keeps working from the local demo data and
  surfaces a non-blocking error instead of a blank screen.
- **Month with no appointments** → the grid renders normally and navigation still works.
- **Month boundaries / dates near midnight** → appointments are grouped by their local calendar date.
- **Reschedule to an already occupied or blocked slot** → rejected with a clear message; the original
  appointment is unchanged.
- **A day with many appointments** → the day detail/list scrolls internally without overflowing the page.
- **Deleting a service referenced by a listed appointment** → the appointment keeps its stored service
  name/price snapshot (existing behavior preserved).
- **Mobile menu open + orientation/size change** → the layout adapts without leaving the menu stuck open.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A team member MUST be a first-class entity with a unique identity, name, role/title, avatar
  image reference, short biography, optional Instagram handle, an active/published flag, and a creation
  timestamp.
- **FR-002**: The public landing page MUST include a "Nuestro Equipo / Artistas" section that reads its
  members from the shared managed data source rather than a fixed, code-defined list.
- **FR-003**: The public team section MUST show only active members, each with name, role, avatar
  (placeholder when missing), biography, and an Instagram link only when a handle is present.
- **FR-004**: When no active members exist, the public team section MUST be hidden or show an elegant empty
  state, and MUST NOT break or block the rest of the landing page.
- **FR-005**: The admin area MUST provide an **Equipo** section listing all members (active and inactive)
  with their role and state.
- **FR-006**: The operator MUST be able to create a member with all fields, validating required fields and
  the optional Instagram handle before persisting, and uploading the avatar through the project's existing
  image-upload capability (no new storage mechanism).
- **FR-007**: The operator MUST be able to edit every field of an existing member.
- **FR-008**: The operator MUST be able to activate/deactivate a member; inactive members MUST NOT appear
  publicly but MUST remain visible (marked inactive) in admin.
- **FR-009**: The operator MUST be able to delete a member; deleted members MUST disappear from admin and
  the public section.
- **FR-010**: Team data MUST use the project's shared managed data source, with a local (demo) fallback
  when the backend is not configured or a read fails, mirroring the catalog and services behavior.
- **FR-011**: The admin calendar MUST present a monthly grid on desktop, with a per-day indicator of the
  number and/or status of that day's appointments.
- **FR-012**: Selecting a day MUST reveal that day's appointments (client, service, time, status) with
  approve, cancel and reschedule actions; appointment status transitions and slot exclusivity MUST go
  through the existing domain rules unchanged.
- **FR-013**: Manual time-block creation and removal MUST remain available in the calendar.
- **FR-014**: At widths narrower than 768px, the calendar MUST use a horizontal day selector plus a vertical
  appointment list for the selected day, showing a clear service breakdown, with no horizontal page scroll.
- **FR-015**: The public header MUST provide a mobile navigation menu (hamburger) that opens and closes
  smoothly, closes on Escape or link selection, manages focus sensibly, and keeps touch targets ≥44px.
- **FR-016**: The catalog grid, cart drawer and booking checkout MUST not overflow horizontally down to
  320px, and MUST keep comfortable internal paddings and touch targets.
- **FR-017**: All new or updated UI MUST consume the project's design tokens, use semantic HTML and labeled
  controls, keep visible focus states, honor reduced motion, and stay usable from 320px to 1920px.
- **FR-018**: The project's type-check gate MUST pass with zero errors after the change; existing booking,
  calendar, catalog and services behavior MUST remain intact.

### Key Entities

- **Team member**: an artist or staff member shown publicly — unique id, name, role/title, avatar image
  reference, short biography, optional Instagram handle, active/published flag, creation timestamp. Managed
  in admin; displayed on the landing page.
- **Appointment**: the existing bookable record (unchanged) surfaced by the calendar's month grid and day
  detail/list; carries client, service snapshot, date, time and status.
- **Time block**: the existing manual unavailability record (unchanged) surfaced and managed in the calendar.
- **Calendar month view / selected day**: a derived presentation over appointments and time blocks for a
  given month and a selected local calendar day.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A studio operator can add a team member with an avatar and see it appear in the public team
  section without any code change or redeploy.
- **SC-002**: Deactivating a member removes them from the public section within one reload while keeping
  them manageable in admin.
- **SC-003**: 100% of previously working booking, calendar, catalog and services journeys still complete
  after the change.
- **SC-004**: On desktop, an operator can tell how many/what-status appointments each day of a month holds
  at a glance and open a day's detail in a single click.
- **SC-005**: On a 360px-wide phone, the header, calendar, catalog, cart and booking checkout present zero
  horizontal page scroll and keep primary actions reachable within 2–3 taps.
- **SC-006**: The project's type-check gate passes with zero errors and the build succeeds.
- **SC-007**: All new UI stays usable from 320px to 1920px with visible focus, ≥44px targets and reduced
  motion honored.
- **SC-008**: With no backend configured (demo mode), the public team section renders from the local seed
  and admin team edits persist across reloads.

## Assumptions

- Team members are publicly read-only; only an authenticated operator can create, edit, deactivate or
  delete them.
- A newly created member is active by default; "inactive" is a soft hide that keeps the record for admin.
- The avatar reuses the project's existing image-upload capability; when no avatar is provided or it fails
  to load, an elegant placeholder is shown.
- Instagram handles are stored as entered (the `@` is optional) and rendered as a link to the profile when
  a non-empty handle exists.
- The team list is ordered by creation time (oldest first) unless the studio later requests manual ordering.
- The calendar defaults to the current month on desktop and to the current day on mobile, with
  previous/next navigation; the breakpoint between the grid and the mobile layout is 768px.
- Time blocks and appointment status transitions keep their current rules; the calendar change is a
  presentation/responsive redesign, not a change to booking rules.
- Public copy is Spanish; specs and code comments follow the project's existing conventions.
- The same hybrid data abstraction already used by catalog, bookings and services is reused for team data.
- This feature introduces no monetary fields; existing money rules (integer cents, 50% deposit) are
  untouched.
