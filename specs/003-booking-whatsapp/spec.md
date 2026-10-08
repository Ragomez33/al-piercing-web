# Feature Specification: Booking Flow & WhatsApp Deposit

**Feature Branch**: `003-booking-whatsapp`

**Created**: 2026-10-07

**Status**: Implemented

**Input**: User description: "Convert the mono-store piercing site into a fixed-service booking flow: a Setmore-style service menu on the landing page, a booking page where selecting a service reveals a date/time selector and a client form, an automatic 50% deposit calculation, and a pre-filled WhatsApp message. All styling must consume design tokens only."

## Clarifications

### Session 2026-10-07

- Q: Where does the visitor pick the service? → A: The landing page renders the full Setmore-style menu (grouped by category) and each row deep-links to `/booking?service={id}`; the booking page also renders the selectable list so the flow works standalone.
- Q: How is availability computed with no backend yet? → A: The agenda is a fixed set of 30-minute slots (11:00–19:30) and slot availability is derived deterministically from the selected date so the UI behaves like a real agenda and stays stable between renders.
- Q: Is the deposit actually charged? → A: No. The deposit is displayed and included in the pre-filled WhatsApp message; the studio confirms it manually. No money moves through the site.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the service menu (Priority: P1)

A visitor opens the landing page and sees the studio's piercing services grouped by category (Nariz, Oreja, Boca, Corporal) with name, short description, duration, price and whether a deposit is required. Tapping a service takes them into the booking flow with that service already selected.

**Why this priority**: The service menu is the conversion surface; without it there is nothing to book.

**Independent Test**: Load `/` and confirm the grouped service list renders every service with its price and duration, and that a row links to `/booking?service={id}`.

**Acceptance Scenarios**:

1. **Given** the landing page is rendered, **When** the visitor views the services section, **Then** services appear grouped by category with name, description, duration and price.
2. **Given** a service row, **When** the visitor activates it, **Then** the booking page opens with that service pre-selected and the form revealed.

---

### User Story 2 - Pick a date and time (Priority: P2)

On the booking page, after choosing a service the visitor selects a date (today or later) and then a time slot from the available agenda. Unavailable slots are visually disabled and cannot be chosen.

**Why this priority**: Date/time selection is required for a booking, but it follows service selection.

**Independent Test**: Select a service, choose a date, and confirm a grid of slot pills appears; unavailable slots are disabled and selectable slots set the chosen time.

**Acceptance Scenarios**:

1. **Given** a selected service, **When** the visitor picks a date, **Then** the time-slot grid appears for that date.
2. **Given** the slot grid, **When** the visitor activates an available slot, **Then** it becomes the selected time.
3. **Given** an unavailable slot, **When** the visitor tries to activate it, **Then** nothing is selected (control disabled).

---

### User Story 3 - Client data, deposit & WhatsApp (Priority: P3)

The visitor enters name and WhatsApp (notes optional), sees the 50% deposit and remaining balance, and confirms the booking. Confirmation opens WhatsApp with a pre-filled message containing the service, date/time, price, deposit, balance and client data. Confirmation is impossible until the required data is valid.

**Why this priority**: It completes the flow and captures the lead, but depends on the previous two stories.

**Independent Test**: With a valid service/date/time/name/WhatsApp, confirm the WhatsApp link contains every field; with any required field missing, the confirm action stays disabled.

**Acceptance Scenarios**:

1. **Given** a valid booking, **When** the visitor confirms, **Then** WhatsApp opens with the studio number and the pre-filled message.
2. **Given** missing required data, **When** the visitor views the form, **Then** the confirm action is disabled.
3. **Given** an accented name/service, **When** the message is generated, **Then** the characters are preserved intact.

### Edge Cases

- No service selected → only the menu renders; no date/form is shown.
- Date changed after selecting a time → the chosen time is reset.
- Whole fieldset disabled until a date is chosen.
- WhatsApp phone misconfigured (not digits-only) → no link is produced; the UI does not open a broken tab.
- Very long names/notes → message encodes correctly; layout has no horizontal scroll at 320px.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST render the piercing services grouped by category with name, description, duration, price and a deposit indicator.
- **FR-002**: Each landing service row MUST link to `/booking?service={id}`.
- **FR-003**: The booking page MUST present the selectable service list and reveal the date/time selector and client form once a service is selected.
- **FR-004**: The service menu MUST be a fixed, typed data set (single source of truth) with integer-cent prices.
- **FR-005**: The date selector MUST not allow dates before today.
- **FR-006**: The time selector MUST render the studio agenda slots and disable unavailable ones.
- **FR-007**: The client form MUST require name and WhatsApp; notes are optional.
- **FR-008**: The system MUST compute a 50% deposit and the remaining balance from the service price using integer-cents math.
- **FR-009**: Confirmation MUST open WhatsApp with a pre-filled message containing service, category, duration, date, time, price, deposit, balance, name and WhatsApp (plus notes when present).
- **FR-010**: Confirmation MUST be disabled until service, date, time, name and WhatsApp are valid.
- **FR-011**: The pre-filled message MUST preserve accented and special characters.
- **FR-012**: All new UI MUST consume `tokens.css` custom properties exclusively.

### Key Entities *(include if feature involves data)*

- **PiercingService**: a bookable service — `id`, `name`, `category` (Nariz/Oreja/Boca/Corporal), `priceCents`, `durationMinutes`, `description`, `requiresDeposit`.
- **Slot**: a bookable time within the agenda — `time` (`HH:mm`) and derived availability for the selected date.
- **BookingRequest**: the collected intent — selected service, date, time, client name, client WhatsApp and optional notes.
- **Deposit**: the 50% amount in integer cents plus the derived remaining balance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor reaches the booking form for a chosen service in a single tap from the landing page.
- **SC-002**: Deposit and balance are always exact to the cent for every service price.
- **SC-003**: The generated WhatsApp message contains every booking field for a valid request.
- **SC-004**: Confirmation is impossible with any required field missing.
- **SC-005**: The flow has no horizontal scroll between 320px and 1920px.

## Assumptions

- The studio WhatsApp number is configured before launch (`WHATSAPP_PHONE`, digits only). A placeholder ships in development.
- There is no backend yet: no persistence, no real-time availability. PocketBase is planned for a later feature.
- Slot availability is a deterministic placeholder that simulates a real agenda.
- Prices are stored and computed as integer cents and displayed in USD with 2 decimals.
- Public copy is in Spanish.
