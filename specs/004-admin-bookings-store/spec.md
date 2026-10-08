# Feature Specification: Admin Dashboard, Bookings & Hybrid Data Layer

**Feature Branch**: `004-admin-bookings-store`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implementa el esqueleto funcional del módulo `/admin`, la gestión de citas/disponibilidad y la capa híbrida de datos (Mock Fallback) para la aplicación web de ALPIERCING. (1) Abstracción de datos y Mock Fallback: servicio unificado que detecta el entorno; si `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` no están presentes opera en Modo Demo con `localStorage` y datos estáticos; si existen, conmuta a Modo Producción con Supabase; toda la app (`index`, `catalog`, `booking`, `admin`) consume datos a través de esta capa. (2) Flujo de citas e integración de reserva: al seleccionar una fecha se consultan las `bookings` y se bloquean los `time_slot` ocupados con estado `CONFIRMED` o `PENDING`; al confirmar se guarda el registro y se redirige a WhatsApp; se muestran los datos de pago de la seña 50% (Pago Móvil / Binance Pay); el número destino se lee de `PUBLIC_WHATSAPP_PHONE` con respaldo en `src/lib/config.ts`. (3) Dashboard de administración con UI Dark Premium: acceso por PIN (`1234`) en `sessionStorage`; pestaña Agenda y Citas (`/admin?tab=bookings`) con lista (Cliente, Servicio, Fecha/Hora, Estado, Monto de Seña), acciones `[Confirmar Cita]`/`[Cancelar]` y filtro por fecha; pestaña Inventario y Catálogo (`/admin?tab=catalog`) con tabla de productos, edición de stock inline, toggle publicar/ocultar y modal para agregar productos (Nombre, Categoría, Precio en centavos, Stock, Imagen). (4) `npx astro check` y `npx astro build` con 0 errores y 0 advertencias."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Studio owner manages bookings from the admin agenda (Priority: P1)

The studio owner opens the admin panel, unlocks it with a PIN, and reviews the bookings
received. For each booking they see the client, the piercing service, the date/time, the current
status and the 50% deposit amount. They can confirm a booking (it becomes `CONFIRMED`, locking the
slot) or cancel it (it becomes `CANCELLED`, releasing the slot), and filter the list to a single
day to plan the agenda.

**Why this priority**: Managing incoming bookings is the operational core of the studio; without
it the admin module delivers no value.

**Independent Test**: Unlock the panel, open the bookings tab, confirm one booking and cancel
another, and verify their statuses and deposit amounts update; filter by a date and verify only
that day's bookings remain.

**Acceptance Scenarios**:

1. **Given** the admin panel is locked, **When** the owner enters the correct PIN, **Then** the
   panel unlocks and the bookings list is visible.
2. **Given** an unlocked panel with a `PENDING` booking, **When** the owner activates
   `[Confirmar Cita]`, **Then** the booking status becomes `CONFIRMED` and it is reflected in the
   list.
3. **Given** an unlocked panel with an active booking, **When** the owner activates `[Cancelar]`,
   **Then** the booking status becomes `CANCELLED`.
4. **Given** the bookings list, **When** the owner selects a date filter, **Then** only bookings
   for that date are shown.

---

### User Story 2 - Client books an available slot and confirms via WhatsApp (Priority: P2)

A client selects a service and a date on the booking page. Slots already taken by an active
booking are shown as unavailable and cannot be chosen. When the client confirms, the booking is
recorded and WhatsApp opens with a pre-filled message that includes the service, date/time, price,
the 50% deposit and the payment options (Pago Móvil / Binance Pay).

**Why this priority**: Prevents double-booking and completes the reservation, but it depends on the
data layer and complements the admin agenda.

**Independent Test**: Create a booking for a given date/time, then reopen booking for the same date
and verify that slot is unavailable; confirm a booking and verify the WhatsApp message contains the
summary and the deposit/payment details.

**Acceptance Scenarios**:

1. **Given** an existing `PENDING` or `CONFIRMED` booking for a date and time, **When** a client
   selects that date, **Then** that time slot is shown as unavailable.
2. **Given** a date with free slots, **When** the client confirms a valid booking, **Then** the
   record is saved and a WhatsApp conversation opens with the pre-filled summary.
3. **Given** a booking being confirmed, **When** the confirmation summary is shown, **Then** it
   displays the 50% deposit amount and the Pago Móvil / Binance Pay options.

---

### User Story 3 - Studio owner manages catalog and inventory (Priority: P3)

From the admin panel the owner switches to the catalog tab, sees every product/jewel with its
stock and published state, edits stock inline, publishes or hides a product from the public
catalog, and adds a new product through a modal capturing name, category, price in cents, stock and
image.

**Why this priority**: Inventory upkeep is important but secondary to bookings, and it is
independently usable.

**Independent Test**: Change a product's stock inline, toggle its published state, and add a new
product; verify the values persist and that hidden products no longer appear in the public catalog.

**Acceptance Scenarios**:

1. **Given** the catalog tab, **When** the owner edits a product's stock, **Then** the new value is
   saved and shown after reload.
2. **Given** a published product, **When** the owner toggles it off, **Then** it is hidden from the
   public catalog.
3. **Given** the catalog tab, **When** the owner submits the add-product modal with valid fields,
   **Then** the product appears in the table and in the public catalog.

---

### User Story 4 - The app works with or without a live backend (Priority: P4)

An operator can run and demo the whole site with no backend configured: bookings, stock changes and
new products persist on the device and the sample content is used. When backend configuration is
provided, the same workflows automatically use the live backend with no code changes.

**Why this priority**: Enables development, demos and a safe fallback, but the site is still usable
once a backend is live; it underpins the other stories.

**Independent Test**: Run with no configuration and complete a booking + a stock edit (they persist
locally); then provide configuration and repeat the workflows against the live backend.

**Acceptance Scenarios**:

1. **Given** no backend configuration, **When** the app loads, **Then** it operates in demo mode
   using on-device storage and sample data with no errors.
2. **Given** backend configuration present, **When** the app loads, **Then** it reads and writes
   through the live backend without any code change.
3. **Given** demo mode, **When** a booking or catalog change is made and the page is reloaded,
   **Then** the change is still present.

### Edge Cases

- What happens when the PIN is wrong or empty? Access is denied and the panel stays locked; no data
  is shown.
- What happens when the unlocked admin session ends (browser store cleared / new session)? The panel
  relocks and the PIN is required again.
- What happens when two clients pick the same slot at nearly the same time? Only one active booking
  may hold a slot; the second must be prevented or reconciled.
- What happens when a booking is cancelled? Its slot becomes available again.
- What happens when a date has no bookings? All agenda slots are offered.
- What happens when the WhatsApp destination is not configured? A safe default is used so the flow
  never breaks.
- What happens when a new product is submitted with missing or invalid fields (empty name, negative
  price/stock)? Submission is blocked with a clear message.
- What happens when the device storage is unavailable or full in demo mode? The app degrades
  gracefully without crashing and informs the user.
- What happens when the live backend is configured but unreachable? The user sees an error state and
  no partial/corrupt writes are shown as successful.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST run end-to-end with **no backend configured**, using on-device storage
  and bundled sample content (demo mode).
- **FR-002**: The system MUST automatically switch to the **live backend** when backend configuration
  is present, with no code changes and no separate build.
- **FR-003**: Every module (landing, catalog, booking, admin) MUST read and write domain data through
  a single unified data layer.
- **FR-004**: When a client selects a date, the system MUST mark time slots already occupied by a
  `PENDING` or `CONFIRMED` booking as unavailable.
- **FR-005**: Cancelled bookings MUST NOT block a slot.
- **FR-006**: Confirming a booking MUST persist it with the captured client, service, date, time and
  a `PENDING` status.
- **FR-007**: Confirming a booking MUST open a WhatsApp conversation pre-filled with the booking
  summary and addressed to the configured studio number.
- **FR-008**: The confirmation summary MUST show the 50% deposit amount and the payment options
  (Pago Móvil / Binance Pay).
- **FR-009**: The destination WhatsApp number MUST be read from configuration with a documented
  fallback default.
- **FR-010**: The admin panel MUST require a PIN before showing any data; the unlocked state MUST
  persist only for the current browser session.
- **FR-011**: The bookings tab MUST list each booking with client, piercing service, date/time,
  status (`PENDING`, `CONFIRMED`, `CANCELLED`) and the 50% deposit amount.
- **FR-012**: The admin MUST be able to change a booking status to `CONFIRMED` and to `CANCELLED`.
- **FR-013**: The bookings tab MUST allow filtering by a single date (daily agenda).
- **FR-014**: The catalog tab MUST list products/jewels with stock and published state.
- **FR-015**: The admin MUST be able to edit a product's stock inline and save it.
- **FR-016**: The admin MUST be able to publish/unpublish a product; unpublished products MUST NOT
  appear in the public catalog.
- **FR-017**: The admin MUST be able to add a new product capturing name, category, price in cents,
  stock and image.
- **FR-018**: All writes MUST be reflected immediately in the acting view and persist across reloads
  in the active mode.
- **FR-019**: All new UI MUST use the existing Dark Premium design tokens and match the established
  look and accessibility (labels, focus states, ≥ 44px targets).
- **FR-020**: The project MUST build and type-check with **zero errors and zero warnings**.

### Key Entities *(include if feature involves data)*

- **Booking**: a reservation request — client identity/contact, the piercing service, a date, a time
  slot, a status (`PENDING` / `CONFIRMED` / `CANCELLED`) and the 50% deposit amount (integer cents).
- **Service**: a bookable piercing service from the fixed menu (category, price in cents, duration,
  deposit flag).
- **Product**: a catalog item — name, category, price in cents, stock (units), published state and
  image reference.
- **Admin session**: the temporary unlocked state of the panel for the current browser session.
- **Data mode**: whether the app is operating in demo mode (on-device) or against the live backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The studio owner can confirm or cancel a booking in at most 2 interactions from the
  agenda.
- **SC-002**: A slot with an active (`PENDING` or `CONFIRMED`) booking is never offered to a second
  client for the same date.
- **SC-003**: The complete book → persist → appear-in-admin flow works with **no backend configured**
  and zero errors.
- **SC-004**: The same workflows run against the live backend when configured, without code changes.
- **SC-005**: The owner can update stock or publish state in at most 2 interactions and the public
  catalog reflects the change.
- **SC-006**: The admin panel cannot display data without a valid PIN.
- **SC-007**: The application reaches a clean result on its automated type-check and production
  build gate (zero errors, zero warnings) before release.

## Assumptions

- The live backend is a hosted relational/BaaS service configured via public environment variables;
  its exact provider is not material to the behavior.
- Demo mode seeds from the existing static service and product content and persists changes on the
  device.
- The PIN for this version is `1234` and is a simple gate, not full authentication; a single studio
  uses the panel.
- Payment details shown for the deposit are configurable placeholders (not real accounts) in this
  version, since the studio confirms the deposit manually via WhatsApp.
- The agenda is the existing fixed set of 30-minute slots (11:00–19:30) and dates use the device's
  local timezone.
- A booking's deposit is 50% of the service price, computed in integer cents.
- New-product images are provided as asset references/URLs; a placeholder is used when absent.
- The public site (landing, catalog, booking) keeps its current content and behavior except that
  data now flows through the unified data layer.
