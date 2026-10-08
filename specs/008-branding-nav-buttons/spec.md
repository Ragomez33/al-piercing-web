# Feature Specification: Icon Branding, Navigation & Button System

**Feature Branch**: `008-branding-nav-buttons`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Realiza ajustes visuales, de integración de imagen y de navegación para ALPIERCING: (1) Integración del isotipo/logo (`public/icon.png`) en favicon/metadatos del layout (`<link rel=icon type=image/png href=/icon.png>` y apple-touch-icon), navbar público flotante (imagen a la izquierda de la cápsula, con `mix-blend-mode: screen` si tiene fondo blanco), header admin (icono junto a 'ALPIERCING Admin') y Footer (logo pequeño junto a la firma FORGE Labs). (2) Separación de navegación pública vs admin: ocultar la barra pública en `/admin` (panel con header propio); navbar público estilo cápsula/dock (radius 9999px, max-width 650px, top 1rem, fondo dark glassmorphism rgba(17,17,19,0.85) + blur(16px) + borde rgba(255,255,255,0.08), sombra 0 10px 30px -10px rgba(0,0,0,0.5)). (3) Sistema de botones Dark Gold: `.btn-primary` (fondo `#E5A93C`, texto `#111113`, radius 12px, hover translateY(-1px) + glow `0 4px 20px rgba(229,169,60,0.3)`) y `.btn-secondary` (fondo `rgba(255,255,255,0.04)`, borde `rgba(255,255,255,0.12)`, hover borde `rgba(229,169,60,0.4)`). Verificar `npx astro check` con 0 errores."

## Clarifications

### Session 2026-10-07

- Q: ¿El asset del logo es `icon.png` o `logo.png`? → A: `logo.png` (`public/images/logo.png`; fue un typo). Todas las superficies (favicon/apple-touch, dock público, header admin, footer) referencian `/images/logo.png`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public and admin navigation are separated (Priority: P1)

A visitor browsing the public pages sees the docked main navigation (Inicio, Catálogo, Reservar).
When the studio owner opens the private panel, that public navigation disappears so the panel reads
as a distinct workspace with its own header (studio identity + `[Cerrar Sesión]`).

**Why this priority**: Mixing public and admin chrome is confusing and leaks navigation into a
private area; separation is the foundation for the rest.

**Independent Test**: Open `/`, `/catalog` and `/booking` → public navigation renders. Open `/admin`
→ public navigation absent; panel header (identity + sign-out) present.

**Acceptance Scenarios**:

1. **Given** a public page, **When** it renders, **Then** the main navigation is visible.
2. **Given** the admin page, **When** it renders, **Then** the public navigation is hidden and the
   panel's own header (identity + `[Cerrar Sesión]`) is shown.

---

### User Story 2 - The public navigation floats in a glass capsule (Priority: P2)

The public navigation renders as a centered, rounded dock at the top of the viewport — a dark
translucent glass surface with blur, a subtle light border and a soft elevated shadow — with the
brand/logo on its left, so it reads as an intentional floating dock rather than ghost text.

**Why this priority**: The docked capsule is the visible identity of the public header and improves
legibility; it builds on the navigation separation.

**Independent Test**: Load any public page and confirm the navigation is a centered rounded capsule
(contained width, top offset, translucent blurred background, light border, soft shadow) with the
logo at the left, remaining legible while scrolling.

**Acceptance Scenarios**:

1. **Given** a public page, **When** the header renders, **Then** links and logo sit inside a
   centered, rounded pill container with a max width and top offset, logo on the left.
2. **Given** the pill header, **When** the page scrolls, **Then** the capsule keeps its translucent
   glass surface and stays legible over content.
3. **Given** a logo with a white background, **When** it renders inside the dark capsule, **Then** it
   blends in via a screen-style blend (white disappears), keeping the gold emblem visible.

---

### User Story 3 - The icon/logo appears consistently across surfaces (Priority: P2)

The same brand icon is used as the site favicon/mobile icon, inside the public navbar, in the admin
header next to "ALPIERCING Admin", and small in the global footer near the FORGE Labs attribution.

**Why this priority**: Brand consistency across surfaces reinforces recognition; it is additive and
independent of navigation logic.

**Independent Test**: Load the site (favicon/mobile icon set), the public pages (logo in the dock),
`/admin` (logo + "ALPIERCING Admin") and the footer (small logo next to FORGE Labs) and verify the
icon appears in all four places.

**Acceptance Scenarios**:

1. **Given** the site head, **When** a page loads, **Then** the favicon and Apple touch icon resolve
   to the brand icon.
2. **Given** the public dock, **When** it renders, **Then** the logo shows on the left.
3. **Given** the admin header, **When** it renders, **Then** the icon appears next to
   "ALPIERCING Admin".
4. **Given** the global footer, **When** it renders, **Then** a small logo appears near the corporate
   attribution.

---

### User Story 4 - Primary and secondary buttons follow the Dark Gold system (Priority: P3)

All primary action buttons use the gold primary style (gold fill, dark text, radius, hover elevation
with a gold glow), and secondary buttons use a translucent surface with a thin light border that
warms to gold on hover.

**Why this priority**: Consistent button language reinforces the brand; it is additive and
independent of the navigation/icon work.

**Independent Test**: On the public pages, verify primary and secondary CTAs match the resting and
hover states described.

**Acceptance Scenarios**:

1. **Given** a primary button, **When** it renders, **Then** it uses a gold fill, dark text (weight
   600/700) and the specified radius.
2. **Given** the primary button, **When** hovered, **Then** it elevates slightly and shows a gold glow.
3. **Given** a secondary button, **When** it renders, **Then** it uses the translucent surface with a
   subtle light border.
4. **Given** the secondary button, **When** hovered, **Then** its border warms to gold.

### Edge Cases

- What happens if the browser does not support `backdrop-filter` or `mix-blend-mode`? The capsule
  keeps an opaque dark fallback and the logo stays visible without blend.
- What happens if the icon asset is missing? The favicon/logo fall back to the existing placeholder
  without breaking layout.
- What happens on very small screens (≈320px)? The capsule wraps/compresses links and keeps ≥ 44px
  targets; no horizontal page scroll.
- What happens when the user lands directly on `/admin`? The public navigation never renders.
- What happens when focus moves in the dock or buttons? Visible focus rings remain.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The public navigation (Inicio, Catálogo, Reservar) MUST NOT render on the admin route.
- **FR-002**: The admin area MUST keep its own independent header (identity + `[Cerrar Sesión]`).
- **FR-003**: On public routes the navigation MUST render as a centered rounded capsule: pill radius,
  max width ≈ 650px, top offset ≈ 1rem.
- **FR-004**: The capsule MUST use a dark glassmorphism surface (translucent dark fill, backdrop
  blur, subtle light border) and a soft elevated shadow.
- **FR-005**: The capsule MUST place the brand/logo on its left; a white logo background MUST be
  blended away (screen-style blend) so the gold emblem stays visible on the dark surface.
- **FR-006**: The site head MUST declare the brand icon as favicon and Apple touch icon.
- **FR-007**: The admin header MUST show the icon beside the "ALPIERCING Admin" title.
- **FR-008**: The global footer MUST show a small version of the icon near the corporate
  attribution.
- **FR-009**: Primary buttons MUST use the gold primary style: gold fill, dark text at weight 600/700,
  the specified radius, hover elevation (`translateY(-1px)`) and a gold glow.
- **FR-010**: Secondary buttons MUST use the translucent surface with a thin light border and a
  gold-tinted border on hover.
- **FR-011**: All new colors/radii/shadows MUST be added as design tokens and referenced by
  components (no raw values in components).
- **FR-012**: The header, icons and buttons MUST stay usable and accessible: ≥ 44px targets, visible
  focus, no horizontal scroll, graceful fallback when blur/blend are unsupported.
- **FR-013**: The build and type-check gates MUST finish with zero errors and zero warnings.

### Key Entities *(include if feature involves data)*

- **BrandIcon**: the shared logo/isotipo asset used as favicon, navbar logo, admin header icon and
  footer mark.
- **PublicNav**: the docked capsule rendered on public routes (brand + three links).
- **AdminHeader**: the independent header of the admin workspace.
- **Button style**: primary/secondary variants applied across public pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The public navigation is present on `/`, `/catalog`, `/booking` and absent on `/admin`.
- **SC-002**: The docked capsule is the consistent public header (centered, contained width, top
  offset, glass surface) on every public page.
- **SC-003**: The brand icon renders in all four expected surfaces (head/icon, dock, admin header,
  footer).
- **SC-004**: Primary and secondary buttons match the specified resting/hover styles on all public
  screens.
- **SC-005**: No horizontal page scroll at 320px–1920px and no focus/broken-layout regressions.
- **SC-006**: The build and type-check gates finish clean.

## Assumptions

- Public routes are `/`, `/catalog` and `/booking`; the admin panel lives only at `/admin`.
- The brand icon is **`public/images/logo.png`** (confirmed in the 2026-10-07 clarification session —
  the original `public/icon.png` was a typo). Every surface (favicon/apple-touch, public dock, admin
  header, footer) references `/images/logo.png`; fallback to the existing placeholder if the file is
  absent.
- The white background of the logo (if present) is erased via `mix-blend-mode: screen` in the dark
  surfaces (dock and footer); a plain render is the no-blend fallback.
- The capsule uses `border-radius: 9999px`, `max-width: 650px`, `top: 1rem` as specified.
- The button redesign applies to the public site's primary/secondary CTAs via token-driven styles;
  navigation pills keep the pill radius, while primary/secondary buttons use the new 12px radius.
- New tokens are added to `tokens.css` first (glass surfaces/borders/shadows, button radius and
  glows), keeping raw color values out of components.