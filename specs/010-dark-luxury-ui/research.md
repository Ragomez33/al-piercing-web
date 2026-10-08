# Phase 0 Research: Dark Luxury UI Redesign

All `Technical Context` unknowns and design questions are resolved below. No `NEEDS CLARIFICATION`
remainders.

## R1. Utility-class hints vs. the token system (no Tailwind)

- **Decision**: Treat every utility-class/CSS/hex hint in the request as **visual intent**, and implement it
  with the existing design-token layer (`src/styles/tokens.css`) plus scoped component `<style>` blocks.
  Add only the semantic tokens required by the new surfaces; raw values stay inside `tokens.css`.
- **Rationale**: The constitution (Principle II) and `design-system.md` forbid Tailwind/atomic CSS and
  require tokens for colors/radii/shadows/spacing/typography; `constitution.md` §2.5 / SDD §3 mandate
  adding new tokens to `tokens.css` **first**. The requested values map cleanly onto the existing palette
  (`#111113`→`--bg-app-body`, `#E5A93C`→`--accent-primary`, `#0a0a0c`→`--bg-footer`, `white/10`→
  `--divider-subtle`).
- **Alternatives considered**: Introducing Tailwind — rejected (governance violation, bundle/runtime cost);
  inlining raw hex in components — rejected (design parity violation).

## R2. Public header: capsule → full-width sticky bar

- **Decision**: Rebuild `src/components/ui/AppHeader.astro` as a full-width `<header>` pinned with
  `position: sticky; top: 0`, a translucent dark surface, a soft backdrop blur and a thin bottom divider.
  Inside, a centered `max-width: 1080px` (≈`max-w-6xl`) row places the brand/logo on the left and the
  `NAV_ITEMS` navigation on the right with generous spacing. Reuse `--bg-navbar-glass`,
  `--blur-navbar`, `--divider-subtle` (adjusting the two glass values to the requested translucency/blur).
- **Rationale**: SC-001/FR-001–FR-005; the header is static Astro (no island needed) and the existing nav
  data is reused. Keeping the nav in the same row at wide widths and allowing wrap at narrow widths avoids
  horizontal scroll at 320px.
- **Alternatives considered**: Keeping the capsule — rejected (spec replaces it); a JS mobile menu —
  rejected (unnecessary island; a wrapping row satisfies 320px without scroll and without new hydration).

## R3. Active navigation state (public)

- **Decision**: Compute the active destination in `AppHeader.astro` from `Astro.url.pathname`
  (exact match for `/`, prefix match for `/catalog` and `/booking`) and expose it via
  `aria-current="page"` plus an `.active` class with a gold accent (text + subtle underline/pill).
- **Rationale**: FR-005/SC-001; `.astro` has access to the request URL at build time, so no client code is
  required.
- **Alternatives considered**: Client-side `window.location` — rejected (forces an island, violates
  Principle I).

## R4. Form-control refinement (compact + gold focus)

- **Decision**: Update the shared control tokens and `.input` skin in `tokens.css`:
  - `--control-padding: 0.625rem 1rem` (from `0.75rem 0.9rem`) and control font-size `0.95rem`.
  - `--control-min-height: 44px` (from 48px) — the smallest reduction that still honors the 44px tactile
    minimum (Principle V / FR-017).
  - New refined surface/border tokens (`--bg-control`, `--border-control`) replacing the elevated surface
    for inputs.
  - Focus: `border-color: var(--accent-primary)` plus a soft outer ring
    (`box-shadow: 0 0 0 3px var(--accent-primary-glow)`), replacing the hard `outline`.
- **Rationale**: FR-010–FR-012/SC-005. Changing the tokens/skin updates every form across booking, admin
  and modals at once (single source of truth) without touching each component.
- **Alternatives considered**: Per-component overrides — rejected (duplicates the skin, the exact problem
  the shared `.input` system was created to solve); dropping below 44px — rejected (accessibility).

## R5. Footer: independent three-column section

- **Decision**: Rebuild `src/components/Footer.astro` as a full-width section on `--bg-footer` with a top
  divider and a centered CSS-grid of three groups: (1) brand + short description, (2) quick links / social
  channels (Instagram + WhatsApp with the existing inline SVG icons), (3) FORGE Labs signature + credits.
  The grid is 1 column on small screens and 3 columns from a medium breakpoint, with a bottom line holding
  the brand/year.
- **Rationale**: FR-013/FR-014, SC-004. CSS grid + a simple media query gives the responsive stack without
  new dependencies or JS.
- **Alternatives considered**: Keeping the current centered column — rejected (spec requires the 3-column
  structure); icon library swap — rejected (constitution forbids new icon libraries; reuse the inline SVGs).

## R6. Admin dashboard shell (sidebar / drawer)

- **Decision**: Restructure `src/components/admin/AdminPanel.svelte` (dashboard branch only) into a
  two-region shell:
  - **Sidebar** (`position: sticky; top: 0; height: 100vh`, fixed width ≈256px, right divider): brand
    "ALPIERCING Admin" at the top, a vertical navigation (`Calendario`, `Inventario` — with lucide icons,
    hover state, and a **gold** active state using `--accent-primary`/`--accent-on`), and a bottom block
    with the mode badge, the signed-in email and the `Cerrar Sesión` button.
  - **Main content** (flex-1, generous padding): the existing calendar/inventory content unchanged.
  - **Small screens**: the sidebar becomes an off-canvas drawer toggled by an accessible button
    (`aria-expanded`, `aria-controls`), with a backdrop; focus moves into the drawer and Escape closes it.
  - Existing tab switch logic (`switchTab`, `?tab=` sync) is preserved; the two vertical nav buttons drive
    it.
- **Rationale**: FR-006–FR-009/SC-002. Retains the single island and all existing data/actions; only the
  surrounding chrome changes. Icons come from the already-installed `lucide-svelte`.
- **Alternatives considered**: A separate admin route/layout per section — rejected (over-scoped, changes
  routing/behavior); a horizontal tab bar restyle — rejected (spec explicitly asks for sidebar/drawer).

## R7. Page stacking model (sticky header/sidebar vs. modals)

- **Decision**: Make the top chrome verifiable-safe against overlays:
  - Introduce z-layer tokens (`--z-header: 30`, `--z-overlay: 40`, `--z-modal: 41` — matching the existing
    40–42 overlay values) and use them for the header/drawer.
  - Remove the stacking-context trap: `<main>` becomes `position: relative` **without** a numeric
    `z-index`, and the decorative top gradient drops to layer `0` (same as the canvas) so `<main>` still
    paints above the decorations by DOM order.
  - Result: normal content paints **below** the sticky header (z 30) while existing modals/drawers
    (z 40–42, now in the root stacking context) paint **above** it.
- **Rationale**: Spec edge case ("modals/drawers render above the redesigned layout") and
  FR-015/SC-003. Currently `<main>` owns a stacking context (`z-index: 2`); a header raised above it would
  cover every modal rendered inside `<main>`. Removing the context is the minimal change that preserves
  both the decorative background order and overlay precedence.
- **Alternatives considered**: Raising overlay z-indexes inside `<main>` — rejected (they cannot exceed a
  higher root-level header while trapped in a stacking context); portaling overlays to `document.body` —
  rejected (larger refactor, unnecessary).

## R8. Behavior preservation & verification

- **Decision**: All data flows, routing, auth, booking/catalog/admin actions and domain services remain
  unchanged; the feature only edits presentation/shell markup and styles. Verification is the existing
  gates — `npx astro check` (0 errors), `npm run build`, `npm run lint` — plus the manual
  `quickstart.md` scenarios that re-run the previously working journeys.
- **Rationale**: FR-015/FR-018, SC-003/SC-006 and the explicit user instruction to run `astro check`.
- **Alternatives considered**: None — this is a hard gate.

## R9. Navigation label copy ("Reserva" vs. "Reservar")

- **Decision**: Keep the navigation labels sourced from `NAV_ITEMS` (`Inicio`, `Catálogo`, `Reservar`). The
  spec's "Reserva" is treated as the destination (`/booking`), not a mandatory literal label; no content
  model change is required.
- **Rationale**: Avoids a copy change that is out of scope and keeps a single source of truth for
  navigation.
- **Alternatives considered**: Renaming the label to "Reserva" — rejected as an unnecessary content change
  not required by the acceptance scenarios.

## R10. Reduced motion & performance

- **Decision**: Any added transitions (nav hover, sidebar/drawer open) are short and disabled under
  `@media (prefers-reduced-motion: reduce)`. The backdrop blur is applied only to the thin header/sidebar,
  not to large scrolling areas, to keep compositing cheap.
- **Rationale**: Principle V / FR-017; keeps interactions at 60fps.
- **Alternatives considered**: Richer animations — rejected (unnecessary cost for a static shell).
