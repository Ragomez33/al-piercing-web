# Feature Specification: Managed Service Catalog (Admin CRUD + Booking)

**Feature Branch**: `011-services-crud`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Montemos este servicio de la misma forma que está el catálogo, con el modo demo si la db no responde o da error, y la consulta real si ya la db está preparada. Tanto el CRUD en admin y el muestreo en la sección de reserva"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The operator manages the piercing service menu (Priority: P1)

An authenticated operator opens `/admin` and finds a **Servicios** section alongside Calendario and
Inventario. There they can see every service, create a new one, edit an existing one (name, category,
price, duration, description, deposit requirement) and activate or deactivate it for the public site.

**Why this priority**: This is the core of the request — the service menu must stop being hardcoded and
become manageable by the studio without a code change or redeploy.

**Independent Test**: Sign in, open Servicios, create a service, edit its price/duration, deactivate it,
and confirm the changes persist after a reload; the public booking menu reflects them.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they open the admin **Servicios** section, **Then** they
   see the current list of services with their category, price, duration and active state.
2. **Given** the Servicios section, **When** the operator creates a new service with valid data, **Then**
   it is persisted and appears in the list.
3. **Given** an existing service, **When** the operator edits its fields, **Then** the changes are
   persisted and reflected in both admin and the public booking menu.
4. **Given** an existing service, **When** the operator deactivates it, **Then** it is hidden from the
   public booking menu but remains visible (marked inactive) in the admin list.
5. **Given** an invalid service (empty name, non-integer/negative price, non-positive duration), **When**
   the operator submits, **Then** a clear validation message is shown and nothing is persisted.

---

### User Story 2 - The visitor books from the live service menu (Priority: P1)

A visitor opens `/booking` and the service list is loaded from the same data source the operator
manages. Each service shows its name, category, description, duration and price, and selecting one drives
the rest of the booking flow exactly as today.

**Why this priority**: The public menu must reflect what the studio manages; otherwise the CRUD has no
effect. It is independently testable and is the client-facing half of the feature.

**Independent Test**: With services present, open `/booking`, confirm the list matches the managed data
(only active ones), select a service and complete the booking flow with the correct price/duration.

**Acceptance Scenarios**:

1. **Given** active services exist, **When** the visitor opens `/booking`, **Then** the menu lists those
   services with name, category, description, duration and price.
2. **Given** a service was deactivated or renamed in admin, **When** the visitor opens/reloads
   `/booking`, **Then** the menu reflects the change (inactive services absent, renamed ones updated).
3. **Given** a visitor selects a service, **When** they continue, **Then** the price, deposit (50%) and
   slot duration are derived from that service (integer cents for money).

---

### User Story 3 - The app keeps working in demo mode / on backend failure (Priority: P2)

If the backend is not configured, or a services query fails, the app must not break: the booking menu and
the admin section fall back to a local (demo) service catalog so the experience and data shape stay
consistent.

**Why this priority**: Mirrors the catalog's resilience; it protects the public flow and the operator
from backend outages, but the primary value is delivered by US1/US2.

**Independent Test**: Run without backend configuration (or force a query error), open `/booking` and
`/admin` Servicios, and confirm the seed catalog is shown and CRUD edits persist locally; then reload to
confirm persistence in demo mode.

**Acceptance Scenarios**:

1. **Given** no backend is configured, **When** the visitor opens `/booking`, **Then** the seed service
   menu is shown.
2. **Given** no backend is configured, **When** the operator creates/edits services in admin, **Then**
   changes are persisted locally and remain after a reload.
3. **Given** the backend is configured but a services query fails, **When** the list loads, **Then** the
   app falls back to the last known/local catalog and surfaces a non-blocking error instead of a blank
   screen.

---

### User Story 4 - Only bookable services are offered publicly (Priority: P3)

Deactivated services never appear in the public booking menu, while the admin can still see and
reactivate them.

**Why this priority**: A refinement of the active/inactive control; it supports US1/US2 but is not the
core flow.

**Independent Test**: Deactivate a service in admin, confirm it is absent from `/booking` but present
(inactive) in admin; reactivate it and confirm it returns.

**Acceptance Scenarios**:

1. **Given** an inactive service, **When** `/booking` renders, **Then** that service is not listed.
2. **Given** an inactive service, **When** the admin Servicios list renders, **Then** the service is
   shown marked as inactive with a reactivate action.

### Edge Cases

- **Accented names/descriptions** → preserved intact in admin, booking and the WhatsApp message.
- **Very long names/descriptions** → layout stays usable at 320px with no horizontal page scroll.
- **Duplicate names** → allowed but each service keeps a unique identity.
- **Deleting a service referenced by an existing booking** → existing bookings keep their stored service
  name/price snapshot; the public menu is unaffected.
- **Price/duration invalid input** → rejected with a clear message; nothing changed.
- **Write fails (permissions or an expired session)** → the write is rejected with a visible error and
  the list is not optimistically changed.
- **Empty catalog** → both admin and booking show an elegant empty state instead of a blank area.
- **Backend becomes configured later** → the app uses the real backend; demo data remains local and
  separate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Services MUST be a first-class domain entity with: a unique identity, name, category,
  description, price (integer cents, ≥ 0), duration (positive minutes), a deposit-required flag, and an
  active/published flag.
- **FR-002**: The public booking menu MUST load services from the shared managed data source rather than
  from a fixed, code-defined list.
- **FR-003**: The public booking menu MUST show only active services.
- **FR-004**: The admin area MUST provide a **Servicios** section listing all services (active and
  inactive) with their category, price, duration and state.
- **FR-005**: The operator MUST be able to **create** a service with all its fields, validating required
  fields and numeric constraints before persisting.
- **FR-006**: The operator MUST be able to **edit** an existing service's fields.
- **FR-007**: The operator MUST be able to **deactivate/reactivate** a service; deactivated services MUST
  NOT appear publicly but MUST remain visible in admin.
- **FR-008**: Changes made in admin MUST be reflected in the public booking menu on the next load.
- **FR-009**: Money MUST be stored and displayed as integer cents; the deposit remains 50% of the price.
- **FR-010**: The booking flow MUST derive the selected service's price, deposit and slot duration from
  the managed service data.
- **FR-011**: When the backend is not configured, the app MUST fall back to a local (demo) service
  catalog seeded with the current service menu, and admin edits MUST persist locally.
- **FR-012**: When a services read fails, the app MUST surface a non-blocking error and keep (or fall
  back to) a usable list instead of failing the page.
- **FR-013**: Core fields (name, category, description, price, duration, deposit flag, active flag) MUST
  be validated on both the admin form and the data layer; invalid input is rejected with a clear message.
- **FR-014**: The service CRUD MUST follow the project's existing admin/data conventions (data access via
  the domain/data layer; no direct backend calls in components; money as integer cents).
- **FR-015**: All new UI MUST consume the project's design tokens and remain usable from 320px to 1920px
  with no horizontal page scroll, preserving accessibility (labeled controls, visible focus, ≥44px
  targets, reduced motion).
- **FR-016**: The project's type-check gate MUST pass with zero errors after the change; existing booking,
  calendar and catalog behavior MUST remain intact.

### Key Entities

- **Service (piercing service)**: the studio's bookable menu item — unique id, name, category
  (from the studio's fixed category set), description, price (integer cents ≥ 0), duration (positive
  minutes), deposit-required flag, active flag. Managed in admin; consumed by booking.
- **Service category**: a fixed grouping (e.g., NOSTRIL, HELIX, NAVEL, TITANIO) used to organize both the
  admin list and the public menu.
- **Service availability (active flag)**: determines whether a service is offered publicly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A studio operator can add a new service and see it appear in the public booking menu
  without any code change or redeploy.
- **SC-002**: An operator can edit a price or duration and the public menu reflects it on the next visit.
- **SC-003**: A deactivated service disappears from the public menu within one reload and remains
  manageable in admin.
- **SC-004**: 100% of previously working booking/calendar/catalog journeys still complete after the
  change.
- **SC-005**: With no backend configured (demo mode), the public menu renders and admin edits persist
  across reloads.
- **SC-006**: The project's type-check gate passes with zero errors and the build succeeds.
- **SC-007**: All new UI stays usable from 320px to 1920px with zero horizontal page scroll and retains
  visible focus and ≥44px targets.

## Assumptions

- This mirrors the **catalog pattern**: a hybrid data layer with a demo seed (local fallback) and a real
  backend table when configured (public read of active items; authenticated writes).
- The capability categories remain the studio's **fixed set** (NOSTRIL, HELIX, NAVEL, TITANIO); the CRUD
  manages services within those categories, not the categories themselves.
- Deactivation is a **soft** state (an active flag), not a physical delete, to keep history and avoid
  breaking existing bookings. A hard delete is not required by this feature.
- The initial local/demo seed is the **current service menu** so behavior is unchanged until the operator
  edits it.
- Money stays integer cents and the deposit is 50% of the price (existing rule).
- Existing bookings store a service name/price snapshot and are unaffected by later service edits.
- The admin shell already provides the navigation pattern (sidebar sections); "Servicios" is added as a
  new section following the same conventions.
- Public copy is Spanish.
- The same data layer abstraction (used by catalog/bookings) is reused for services.
