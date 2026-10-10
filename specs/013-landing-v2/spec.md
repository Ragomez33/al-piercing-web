# Feature Specification: Alternative Setmore-Style Landing Page (Dark Luxury)

**Feature Branch**: `013-landing-v2`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Crea una vista alternativa `src/pages/landing-v2.astro` inspirada en la arquitectura minimalista de Setmore (como ronapiercing.setmore.com), pero aplicando 100% nuestros tokens 'Dark Luxury': 1. Layout e Identidad del Perfil (sección superior compacta con logo/avatar de ALPIERCING, descripción breve, dirección/horario y enlaces sociales Instagram/WhatsApp; badge de estado 'Reservas Online 24/7'). 2. Navegación por Pestañas Internas (Svelte Island) con filtro rápido para alternar entre Servicios (lista agrupada estilo Setmore con duración, precio, badge de seña requerida y botón directo a BookingFlow), Equipo (TeamSection.svelte con los perforadores activos y sus especialidades) y Proceso & Galería (pasos sencillos para reservar y fotos destacadas). 3. Experiencia de Reserva Fluida (cada botón 'Reservar' redirige a /booking?service=[id] o despliega el flujo de reserva sin salir de la página). 4. Estilos (exclusivamente variables de src/styles/tokens.css, fondos oscuros #0A0A0B, tarjetas #121214, acentos dorados/plata; responsive con clamp() y controles táctiles de al menos 44px). Conserva src/pages/index.astro intacta para poder comparar ambas páginas (/ vs /landing-v2). Al finalizar, ejecuta npx astro check."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand the studio and book a service at a glance (Priority: P1)

A first-time visitor opens an alternative, minimalist single-page studio profile. At the top they immediately understand who ALPIERCING is — logo/avatar, a short description, where the studio is and when it is open, and how to reach it on Instagram/WhatsApp — together with a reassurance that booking is available online around the clock. Directly below, they browse the full service menu grouped by category, each entry showing its duration, price and whether a deposit is required, and they can start a booking in one step.

**Why this priority**: This is the smallest slice that delivers the page's core value (discover + book) and it works on its own even if no other section is shown. It also gives the studio a comparable alternative to the current landing for A/B evaluation.

**Independent Test**: Open the alternative landing page and confirm the compact profile header (identity, description, location/hours, Instagram + WhatsApp links, and the "Reservas Online 24/7" badge) and the grouped service list render; activate "Reservar" on a service and confirm the booking experience opens with that service pre-selected.

**Acceptance Scenarios**:

1. **Given** the studio has published services, **When** a visitor opens the alternative landing page, **Then** a compact profile header and the services grouped by category are shown, each service with its duration, price and deposit indicator.
2. **Given** a service entry, **When** the visitor activates its "Reservar" action, **Then** the booking experience opens with that service already selected.
3. **Given** the visitor opens the page, **When** the header renders, **Then** it shows the studio description, address, opening hours, Instagram and WhatsApp links, and a "Reservas Online 24/7" status badge.

---

### User Story 2 - Switch content with quick tabs (Priority: P2)

A visitor uses a set of quick, in-page tabs to move between the page's three content areas — Services, Team, and Process & Gallery — without leaving the page or reloading it.

**Why this priority**: It structures the experience and improves exploration, but the page still delivers its core value (US1) without it.

**Independent Test**: Open the page, select each tab and confirm only the corresponding area is shown and the active tab is clearly indicated; operate the tabs with the keyboard and confirm focus and active state.

**Acceptance Scenarios**:

1. **Given** the alternative landing page, **When** the visitor selects a tab, **Then** the matching content becomes visible, the other areas are hidden, and the selected tab is clearly highlighted.
2. **Given** the tab control, **When** the visitor navigates with the keyboard, **Then** tabs are reachable and operable with a visible focus indicator and the active tab is announced to assistive technology.
3. **Given** a tab is active, **When** the visitor switches away and back, **Then** the content remains consistent and no data is lost.

---

### User Story 3 - Build trust with the team, the process and work photos (Priority: P3)

A visitor reviews the active piercers and their specialties, the simple steps to book, and a selection of featured work photos before deciding to book.

**Why this priority**: It adds confidence and richness to the decision, but it complements rather than enables the primary booking journey.

**Independent Test**: In the Team area confirm each active member appears with name/role/specialty (or an elegant empty state when there are none); in the Process & Gallery area confirm the booking steps and the featured photos render without overflow.

**Acceptance Scenarios**:

1. **Given** active team members, **When** the visitor opens the Team area, **Then** each active member is shown with their role/specialty and image (or placeholder).
2. **Given** no active members, **When** the visitor opens the Team area, **Then** that area is hidden or shows an elegant empty state and the page remains unaffected.
3. **Given** the Process & Gallery area, **When** it renders, **Then** the steps to book are shown in order and the featured photos display with a placeholder fallback if an image is missing.

---

### Edge Cases

- **No published services** → the Services area shows an elegant empty state and the page remains fully usable.
- **No active team members** → the Team area is hidden or shows an elegant empty state (consistent with the public team section).
- **Missing or broken images** (studio avatar, member avatars, gallery) → an elegant placeholder is shown and the layout does not break.
- **Very long service names, descriptions, addresses or bios** → text wraps within its container and the page never scrolls horizontally.
- **Empty location, hours or social handle** → the corresponding element is omitted (no empty rows, no broken links).
- **Very small viewport (320px)** → no horizontal page scroll; tabs and service actions keep touch targets of at least 44px.
- **Reduced-motion preference** → tab/content transitions and any animation are suppressed.
- **Data read failure** → the page falls back to locally available demo content and shows a non-blocking notice instead of a blank area.
- **Direct load / refresh with a tab previously selected** → the page still renders a coherent default view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST provide an alternative landing page at a distinct address, coexisting with and not modifying the current landing page.
- **FR-002**: The alternative landing page MUST open with a compact profile header containing the studio identity (logo/avatar), a short description, the address and opening hours, and links to Instagram and WhatsApp.
- **FR-003**: The header MUST display an availability badge reading "Reservas Online 24/7".
- **FR-004**: The page MUST present the service menu grouped by the categories the studio publishes, each service showing its name, duration, price and a visible indicator when a deposit is required.
- **FR-005**: Every service MUST offer a direct booking action that starts the booking experience with that service pre-selected.
- **FR-006**: The page MUST provide quick tabs that switch between three content areas: Services, Team, and Process & Gallery.
- **FR-007**: The Services area MUST read the service list from the studio's managed data source (not a fixed, code-defined list) and MUST show only published/active services.
- **FR-008**: The Team area MUST show only active team members, each with their name and role/specialty.
- **FR-009**: The Process & Gallery area MUST present the steps to book in a logical order and a selection of featured work photos.
- **FR-010**: The page MUST be fully responsive from 320px to 1920px with no horizontal page scroll, fluid spacing, and interactive controls of at least 44×44px.
- **FR-011**: The page MUST consume only the project's design tokens for colors, surfaces, radii and shadows (dark, premium look; no raw color literals in the page).
- **FR-012**: The page MUST use semantic HTML, labeled controls and visible focus states, and MUST honor the reduced-motion preference.
- **FR-013**: When a data read fails, the page MUST continue to show available fallback content with a non-blocking notice rather than a blank area.
- **FR-014**: The change MUST NOT alter the behavior, content or routes of the existing pages (current landing, catalog, booking, admin), and the project's type-check gate MUST pass with zero errors.

### Key Entities *(include if feature involves data)*

- **Studio profile**: the studio's public identity — brand name, short description, address, opening hours and social contact links.
- **Service**: a bookable offering — name, category, duration, price and whether a deposit is required; grouped by **category** and sourced from the managed catalog.
- **Team member**: an active artist/staff member — name, role/specialty and avatar.
- **Process step**: one ordered step of the booking journey (title and short description).
- **Gallery item**: a featured work photo with a descriptive label/alt text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From arriving on the alternative landing page, a visitor can identify the studio and open a booking for a specific service within two actions (scroll + tap "Reservar").
- **SC-002**: 100% of existing journeys (current landing, catalog, cart, booking and admin) continue to work unchanged after the new page is added; both landing variants coexist.
- **SC-003**: The page presents zero horizontal page scroll at widths from 320px to 1920px, and all interactive controls measure at least 44×44px.
- **SC-004**: The page loads and is fully usable with no runtime errors, and the project's type-check gate passes with zero errors.
- **SC-005**: A studio operator can add, edit or deactivate a service or team member and see the change reflected on the alternative landing page without any code change or redeploy.
- **SC-006**: The alternative landing page renders a coherent default content area on first load (no blank view) and every tab shows its content within one interaction.

## Assumptions

- **Address**: the alternative landing page is reachable at `/landing-v2`, alongside the existing `/`.
- **Booking action**: the "Reservar" action redirects to the existing booking experience with the chosen service pre-selected (the inline, no-navigation variant is an acceptable alternative if trivial to support, but redirect is the default).
- **Content reuse**: the page reuses the existing studio profile, managed service data, public team section, process steps and gallery items rather than introducing new content.
- **Categories are data-driven**: groups mirror whatever categories the studio publishes (for example Nostril, Helix…) instead of a hardcoded list.
- **Tabs**: switching tabs is a client-side interaction; persisting the selected tab in the URL (deep-linkable tabs) is optional and not required.
- **Data source**: services and team come from the same managed data abstraction used elsewhere, with a local/demo fallback when the backend is unavailable, exactly like the current site.
- **Original landing preserved**: `src/pages/index.astro` and its behavior/content remains untouched so the two pages can be compared.
- **Styling**: no new palette is introduced; the Dark Luxury look is achieved with the existing tokens; no atomic utility framework is used.
- **Copy**: public copy is in Spanish, following the project's existing conventions.
- **No new monetary rules**: prices remain integer cents and the existing deposit rules are unchanged; the page only displays them.
