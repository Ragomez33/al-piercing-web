# Feature Specification: Dark Luxury UI Redesign

**Feature Branch**: `010-dark-luxury-ui`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Rediseño UI para mejorar jerarquía, estructura y elegancia Dark Luxury: (1) header público de ancho completo sticky con marca a la izquierda y navegación a la derecha; (2) campos de formulario más compactos y refinados con foco dorado suave; (3) footer rediseñado como sección independiente en 3 columnas (marca, enlaces/redes, créditos FORGE Labs); (4) layout de administración con sidebar/drawer lateral (marca, navegación vertical Calendario/Inventario con estado activo dorado, usuario y cerrar sesión abajo) y área principal amplia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The visitor navigates from a full-width sticky header (Priority: P1)

A visitor lands on any public page and sees a full-width top bar pinned to the top of the viewport. The
brand sits on the left, and the primary navigation links ("Inicio", "Catálogo", "Reserva") sit on the
right with generous spacing. The bar stays visible while scrolling, replacing the previous floating
capsule.

**Why this priority**: The header is the most visible, app-wide element and defines the first impression
of the "Dark Luxury" identity and the navigation hierarchy on every public page.

**Independent Test**: Load each public page, scroll, and confirm the bar spans the full width, remains
fixed at the top, keeps brand-left / navigation-right with wide spacing, and that all three links route
correctly.

**Acceptance Scenarios**:

1. **Given** any public page, **When** it renders, **Then** a full-width bar is present at the top with
   the brand on the left and the navigation links on the right.
2. **Given** the visitor scrolls the page, **When** the content moves, **Then** the header remains pinned
   to the top of the viewport and stays above page content.
3. **Given** the header, **When** the visitor activates "Inicio", "Catálogo" or "Reserva", **Then** the
   corresponding page opens and the active destination is recognizable.
4. **Given** a viewport of 320px width, **When** the header renders, **Then** the brand and navigation
   remain usable without horizontal page scrolling.

---

### User Story 2 - The operator works from a dashboard-style admin layout (Priority: P2)

An operator signs in to `/admin` and sees a modern dashboard: a fixed left sidebar with the
"ALPIERCING Admin" brand at the top, a vertical menu to switch between "Calendario" and "Inventario"
(the current one highlighted in gold), and — at the bottom — user information with a "Cerrar Sesión"
action. The rest of the screen is a spacious main content area holding the calendar or the inventory
tables.

**Why this priority**: It restructures the operator's entire working surface, improving task focus and
making the section hierarchy unmistakable, but it does not block the public experience.

**Independent Test**: Sign in, confirm the sidebar shows brand, both tabs, active-state highlighting,
user info and logout; switch tabs and confirm the main area changes; perform logout. On a small screen,
confirm the sidebar becomes a collapsible drawer and the main content stays reachable.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** `/admin` renders, **Then** a left sidebar shows the
   brand, the "Calendario"/"Inventario" navigation, the user information and a "Cerrar Sesión" action.
2. **Given** the sidebar, **When** the operator selects a section, **Then** it becomes the active item
   highlighted in gold and the main content area shows that section.
3. **Given** a small viewport, **When** the operator opens `/admin`, **Then** the navigation is available
   as a collapsible drawer and does not push the main content off-screen with horizontal scroll.
4. **Given** the operator, **When** they activate "Cerrar Sesión", **Then** the session ends and the login
   view is shown (existing behavior preserved).

---

### User Story 3 - The client fills refined, compact form fields (Priority: P3)

When booking or editing data, the client interacts with form controls that are visually lighter and
shorter than before: reduced vertical height, refined surface, a clearly defined border, and a soft gold
focus state.

**Why this priority**: It improves perceived polish and reduces form bulk, but it is a refinement of
existing working forms rather than new capability.

**Independent Test**: Focus, hover and type in text inputs, date inputs, selects and textareas across the
booking form and the admin product/block forms, confirming the compact height, defined border and soft
gold focus indicator, with no change to data entry behavior.

**Acceptance Scenarios**:

1. **Given** any form control, **When** it is at rest, **Then** it shows the refined surface and a defined
   border consistent across inputs, selects and textareas.
2. **Given** a form control, **When** it receives keyboard focus, **Then** a soft gold border and a subtle
   outer glow indicate focus.
3. **Given** a form, **When** the user completes and submits it, **Then** the existing validation and
   submission behavior is unchanged.

---

### User Story 4 - The visitor sees a structured footer (Priority: P3)

At the bottom of the public pages, a distinct footer section presents the brand and a short description,
quick links or social channels (Instagram / WhatsApp with clean icons), and the FORGE Labs signature and
credits aligned elegantly.

**Why this priority**: It closes the page with a polished, structured section and improves trust, but it
is the least functionally critical surface.

**Independent Test**: Scroll to the bottom of each public page and confirm the footer is a full-width
section with three distinct columns (brand+description, links/socials, FORGE Labs credits), correct link
targets and no overlap with page content.

**Acceptance Scenarios**:

1. **Given** a public page, **When** the footer renders, **Then** it appears as a full-width section with
   a top divider and three columns.
2. **Given** the footer, **When** the visitor activates a social link (Instagram / WhatsApp), **Then** the
   correct destination opens.
3. **Given** a narrow viewport, **When** the footer renders, **Then** the three columns stack vertically
   without horizontal page scrolling.

### Edge Cases

- **Narrow viewport (320px)** → header, footer and admin navigation remain usable with no horizontal page
  scroll.
- **Admin sidebar on small screens** → collapses into a drawer toggled by an accessible control; the main
  content is never pushed off-screen.
- **Very long page content** → the sticky header stays pinned and never overlaps/covers interactive
  content or modals.
- **Focus visibility** → every interactive element keeps a visible focus indicator after restyling.
- **Reduced motion** → any transition/animation added respects the user's reduced-motion preference.
- **Existing modals/drawers** (booking success panel, cart drawer, admin booking/block modals) → they keep
  working and render above the redesigned layout (no stacking or clipping regressions).
- **Brand assets missing** → the layout degrades gracefully without broken alignment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Public pages MUST render a full-width top header that spans the entire viewport width.
- **FR-002**: The public header MUST remain pinned to the top of the viewport while the page scrolls and
  MUST stay above page content.
- **FR-003**: The public header MUST place the brand on the left and the primary navigation ("Inicio",
  "Catálogo", "Reserva") on the right with generous spacing.
- **FR-004**: The public header MUST provide a translucent, refined dark surface with a subtle bottom
  divider, consistent with the Dark Luxury identity.
- **FR-005**: The active/current public section MUST be visually distinguishable in the header.
- **FR-006**: The admin area MUST present a persistent left navigation region (sidebar on wide screens,
  drawer on small screens) alongside a main content area that occupies the remaining space.
- **FR-007**: The admin sidebar MUST show the "ALPIERCING Admin" brand at the top, a vertical navigation
  for "Calendario" and "Inventario", and — at the bottom — user information plus a "Cerrar Sesión"
  action.
- **FR-008**: The admin sidebar MUST mark the active section in a gold accent and provide a refined hover
  state for inactive items.
- **FR-009**: The admin main content area MUST present the calendar or inventory with ample, consistent
  spacing/margins.
- **FR-010**: All form controls (text fields, date fields, selectors and multi-line text areas) MUST use a
  reduced, compact vertical height and a smaller refined text size across the application.
- **FR-011**: Form controls MUST present a refined dark surface with a clearly defined border, consistent
  at rest across control types.
- **FR-012**: Focused form controls MUST show a soft gold border with a subtle outer ring; visible focus
  MUST be preserved for keyboard users.
- **FR-013**: Public pages MUST render a footer as an independent, full-width section with a top divider.
- **FR-014**: The footer MUST structure its content into three groups: (1) brand + short description,
  (2) quick links/social channels (Instagram / WhatsApp) with clean icons, and (3) FORGE Labs signature
  and credits.
- **FR-015**: The redesign MUST NOT change any existing functional behavior: public navigation and routing,
  booking submission (persist-first + success panel), admin authentication/logout, calendar actions and
  inventory management MUST continue to work unchanged.
- **FR-016**: All new and modified UI MUST consume the project's design tokens exclusively and remain
  usable from 320px to 1920px with no horizontal page scroll.
- **FR-017**: All new and modified UI MUST preserve accessibility: semantic structure, labeled controls,
  visible focus states, tactile targets of at least 44px, and reduced-motion support.
- **FR-018**: The project's type-check gate MUST pass with zero errors after the redesign, with existing
  components and types remaining consistent.

### Key Entities

- **Public header**: the app-wide top bar (brand + primary navigation) with pinned/translucent styling.
- **Form control appearance**: the shared visual treatment (surface, border, height, focus ring) applied to
  inputs, selects and textareas.
- **Footer section**: the structured end-of-page region with three content groups.
- **Admin shell**: the dashboard layout composed of a navigation region (sidebar/drawer) and a main content
  area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can identify and reach any of the three primary public destinations from the header
  in a single interaction and under 5 seconds.
- **SC-002**: An operator can switch between "Calendario" and "Inventario" in a single interaction, with
  the active section distinguishable by color alone in a visual scan.
- **SC-003**: 100% of previously working user journeys (public navigation, booking submission with success
  panel, admin login/logout, calendar approve/cancel/reschedule, inventory management) still complete
  successfully after the redesign.
- **SC-004**: The redesigned surfaces remain usable from 320px to 1920px with zero horizontal page scroll
  on every public and admin view.
- **SC-005**: 100% of interactive controls retain a visible focus indicator and meet the 44px minimum
  tactile target after restyling.
- **SC-006**: The project's type-check gate passes with zero errors and the build succeeds after the change.

## Assumptions

- This is a **visual/structural redesign only**; no data, booking, session or routing behavior changes.
- Styling MUST follow the project's existing **design token system** and scoped component styles. The
  utility-class/CSS hints in the request express visual intent and are to be translated into tokens and
  scoped styles; introducing a utility/atomic CSS framework is out of scope and conflicts with project
  governance.
- The public copy stays in Spanish.
- The previous floating capsule header is **replaced**, not kept alongside the new full-width bar.
- The footer is for **public pages**; the admin area keeps its own dashboard shell without the public
  footer.
- On small screens the admin navigation becomes a **collapsible drawer** with an accessible toggle; on
  wide screens it is a persistent sidebar.
- The public header layout is a single row (brand left, navigation right) with generous spacing; a mobile
  navigation pattern (e.g., compact menu) is allowed as long as all three destinations stay reachable at
  320px without horizontal scroll.
- The brand logo asset and existing icon set are reused; no new third-party libraries are introduced.
- Existing modals/drawers/overlays keep their current stacking so the sticky header/sidebar do not cover
  them.
- The Dark Luxury palette is derived from existing tokens (deep charcoal surfaces, near-black footer,
  gold accent); no new brand colors beyond the established palette are required.
