# Contract: Responsive Shell (Header Drawer + Catalog/Cart/Booking Overflow)

**Feature**: 012-team-members-calendar · **Phase**: 1 (Design & Contracts)

CSS/layout hardening only — no behavior, data or token-semantics changes. Breakpoint: **768px**.

## 1. Public header mobile drawer

- New island `src/components/ui/MobileNav.svelte`, mounted by `src/components/ui/AppHeader.astro` with
  **`client:load`** (the header is above the fold; justified against Principle 1).
- `AppHeader.astro` keeps the brand and the desktop `NAV_ITEMS` list; the desktop `.nav` is
  `display: none` below 768px, and the island's hamburger is `display: none` at ≥768px.
- Hamburger button: `aria-label`, `aria-expanded`, `aria-controls`, min 44×44px, `lucide-svelte` `Menu` /
  `X` icon.
- Drawer panel (off-canvas, right or top): the `NAV_ITEMS` links with active state derived from
  `window.location.pathname`; each link ≥44px.
- Behavior:
  - open → move focus into the panel; lock body scroll (`overflow: hidden` on `document.body`);
  - close on link selection, `Escape`, and backdrop click;
  - close → restore focus to the toggle; release the scroll lock;
  - `onDestroy` cleans up listeners and the scroll lock.
- Visual: uses `--overlay-backdrop`, `--z-overlay` / `--z-modal`, `--bg-navbar-glass`, `--blur-navbar`,
  pill/btn radius tokens, `--shadow-glow`; transitions honor `prefers-reduced-motion`.

## 2. Catalog grid (`CatalogGrid.svelte`, `ProductCard.svelte`)

- Container padding uses `clamp()`; grid columns remain 1 (≤360px) / 2 (default) / 4 (≥768px).
- Grid children get `min-width: 0`; card titles/prices use `overflow-wrap: anywhere` (or `break-word`).
- Product card: `min-width: 0`; the `+` add control and any action keep ≥44px targets; the "Agotado"
  badge must not force overflow.
- No horizontal page scroll at 320px; images stay within `aspect-ratio: 1 / 1` containers.

## 3. Cart drawer (`CartDrawer.svelte`)

- FAB stays fixed bottom-right with ≥44px target.
- Drawer width: `width: min(420px, 100%)` (or `100vw` at very small widths); never exceeds the viewport.
- Internal padding uses `clamp()`; each line uses `min-width: 0` and the product name wraps
  (`overflow-wrap: anywhere`); quantity controls + remove button stay ≥44px.
- Totals and payment options wrap without overflowing; the checkout button is full-width and ≥44px.
- The drawer/RHS never introduces a page-level horizontal scrollbar; it may scroll internally
  (`overflow-y: auto`).

## 4. Booking checkout (`BookingFlow.svelte`)

- `.services` / `.booking` padding uses `clamp()`; the selected-service summary wraps
  (`flex-wrap`, `min-width: 0`).
- Form controls are `width: 100%` / `box-sizing: border-box`; the slot grid `minmax` column floor is
  reduced on small screens (e.g. `minmax(64px, 1fr)`) so slots wrap instead of overflowing.
- The deposit summary rows wrap when the labels are long; the submit button is full-width and ≥52px.
- The success modal keeps `width: min(440px, calc(100% - 2rem))` and scrolls internally if needed.
- No horizontal page scroll at 320px.

## 5. Global rule

- Ensure `*, *::before, *::after { box-sizing: border-box; }` exists in `src/styles/tokens.css` (add if
  absent) so padding never expands elements past their container.
- Every interactive control keeps visible focus (`:focus-visible`) and ≥44px touch target; animations and
  transitions honor `prefers-reduced-motion: reduce`.
