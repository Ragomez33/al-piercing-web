# Feature Specification: Landing Page & Base Layout

**Feature Branch**: `001-landing-page`

**Created**: 2026-10-07

**Status**: Implemented

**Input**: User description: "Build the base layout and the Landing Page module (index) for the piercing studio web app, rigorously applying the Dark Premium design tokens (Charcoal Black + Neon Gold). Include the global styles file (tokens.css), a base layout with a gold-sheen top gradient and an ink-motion background, a navigable header with the brand centered and quick links (Inicio, Catálogo, Reservar), and the landing page itself with: Hero (headline, studio bio, location, two CTAs), a Setmore-style service menu, a featured gallery, and a 3-card process/trust block (Consulta y Diseño, Reserva con Seña 50%, Perforación y Cuidados)."

> **Related features**: the fixed service menu rendered inside this landing page is specified in
> [`specs/003-booking-whatsapp/spec.md`](../003-booking-whatsapp/spec.md) (FR-011 here). The
> gallery is a **section** of `/` — there is no separate `/gallery` route.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Studio introduction & primary actions (Priority: P1)

A first-time visitor opens the studio site and immediately understands who the studio is, what it
specializes in (piercings & body jewelry) and where it is located. From the hero they can start the
booking flow ("Reservar Turno — 50% Seña") or browse the jewelry catalog ("Ver Catálogo de
Joyería") in a single click/tap.

**Why this priority**: The hero is the conversion point — it turns visits into bookings and catalog visits.

**Independent Test**: Load the landing page and confirm the hero content (headline, studio bio, location) renders and each CTA navigates to its destination.

**Acceptance Scenarios**:

1. **Given** a visitor lands on the homepage, **When** the page finishes rendering, **Then** they see a hero with a stylized headline, a short studio bio and the location.
2. **Given** the hero is visible, **When** the visitor activates "Reservar Turno (50% Seña)", **Then** they are taken to `/booking`.
3. **Given** the hero is visible, **When** the visitor activates "Ver Catálogo de Joyería", **Then** they are taken to `/catalog`.

---

### User Story 2 - Featured work preview (Priority: P2)

A visitor browses a gallery of four featured piercings/body-jewelry pieces placed below the hero and
the service menu, rendered with the studio's card style, to build trust in the studio's work.

**Why this priority**: Gallery quality is the strongest trust signal after the hero, but the page remains valuable without it.

**Independent Test**: Verify four featured works render with the card style and that a missing asset falls back to a placeholder without breaking the grid.

**Acceptance Scenarios**:

1. **Given** the gallery section is rendered, **When** the visitor views it, **Then** four preview cards are displayed using the established card style.
2. **Given** one featured image is missing, **When** the section renders, **Then** a placeholder tile is shown and the grid stays intact.

---

### User Story 3 - Process & trust explanation (Priority: P3)

A visitor learns how the studio works through three cards — (1) Consulta y Diseño, (2) Reserva con
Seña (50%), (3) Perforación y Cuidados — reducing uncertainty before deciding to book.

**Why this priority**: Explaining the process builds trust and prepares clients, but it is supporting content.

**Independent Test**: Verify the three process cards are visible in order with their titles and short descriptions.

**Acceptance Scenarios**:

1. **Given** the process block is rendered, **When** the visitor views it, **Then** three cards titled "Consulta y Diseño", "Reserva con Seña (50%)" and "Perforación y Cuidados" appear in that order.

---

### Edge Cases

- What happens when the decorative ink background cannot run (reduced-motion preference, no JavaScript, low-end device)? The page content MUST remain fully readable and usable.
- What happens on very small (≈320px) or very wide (≥1920px) screens? The layout MUST adapt without horizontal scrolling.
- What happens when a featured image is missing? The card MUST show a placeholder without breaking the grid.
- What happens when the destination routes are not yet implemented? The CTAs MUST still be reachable targets.
- What happens when the studio bio text is long? The layout MUST accommodate variable text length without overflow.
- What happens if the visitor prefers reduced motion? No continuous background animation MAY play.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST present a hero section with a stylized primary headline, a short studio biography and the studio location.
- **FR-002**: The hero MUST include a primary call-to-action that takes visitors to `/booking` and a secondary call-to-action that takes visitors to `/catalog`.
- **FR-003**: Every page MUST share a consistent header showing the brand centered over the top gold-sheen gradient and providing quick navigation to Inicio, Catálogo and Reservar.
- **FR-004**: The page MUST apply the studio's documented dark-premium visual identity consistently: a gold-sheen gradient in the top region, charcoal cards with a thin industrial border, rounded corners, and the brand accent color for primary actions. All styling MUST consume `tokens.css` custom properties.
- **FR-005**: The landing page MUST render a subtle, decorative ink-motion background in the top region of the page.
- **FR-006**: The decorative background MUST NOT cover or obscure main content, MUST keep the page smooth (targeting 60fps on mid-range devices), and MUST NOT play continuously when the user prefers reduced motion.
- **FR-007**: The landing page MUST display a gallery of four featured piercing/body-jewelry works using the established card style.
- **FR-008**: The landing page MUST display a process/trust block with three cards in order: (1) Consulta y Diseño, (2) Reserva con Seña (50%), (3) Perforación y Cuidados.
- **FR-009**: The page MUST be usable and horizontally scroll-free from small mobile widths up to large desktop widths.
- **FR-010**: The page MUST remain readable and fully functional if the decorative background fails to run or JavaScript is unavailable.
- **FR-011**: The landing page MUST also host the fixed Setmore-style service menu defined in the booking feature (`specs/003-booking-whatsapp`), rendered statically from the typed service data.

### Key Entities *(include if feature involves data)*

- **StudioProfile**: the studio identity shown in the hero and header — name/brand, a short biography and the location.
- **GalleryItem**: a highlighted work shown as a preview card; attributes are the image, a REQUIRED `alt` and an optional short label/category.
- **ProcessStep**: one stage of the working flow with a fixed order (1–3), a title and a short description.
- **NavigationItem**: a header link with a label and a destination (Inicio, Catálogo, Reservar).
- **PiercingService**: the bookable service shown in the menu — defined in the booking feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify the studio's specialty and how to book within 5 seconds of the page rendering.
- **SC-002**: From the landing page, a visitor can reach the booking flow in a single click/tap.
- **SC-003**: Primary hero content is visible within 2 seconds on a typical mobile connection.
- **SC-004**: The background animation sustains smooth motion without making scrolling or interaction feel janky on a mid-range mobile device.
- **SC-005**: The page has no horizontal scroll between 320px and 1920px viewport widths.
- **SC-006**: 90% of test users identify the "book appointment" action on the first attempt.
- **SC-007**: When the user prefers reduced motion, no continuous background animation plays.

## Assumptions

- The project's brand tokens and visual rules are already defined and MUST be applied without deviation.
- The booking, catalog and admin modules exist as separate pages/routes; if initially stubs, the CTAs still navigate to them.
- Featured images and studio bio/location text are supplied by the studio; representative placeholder content may be used during development.
- Public copy of the landing page is in Spanish.
- Visitors come primarily from mid-to-low-range mobile devices; a mobile-first layout is required.
- No content management system is required for this feature; gallery and process content is static.
- The decorative ink background is an optional enhancement and MUST never degrade content accessibility or usability.
