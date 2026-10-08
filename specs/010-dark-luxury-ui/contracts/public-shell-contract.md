# Contract: Public Shell (Header & Footer)

**Feature**: 010-dark-luxury-ui

Governs the static public shell components `src/components/ui/AppHeader.astro` and
`src/components/Footer.astro`, rendered through `src/layouts/BaseLayout.astro`.

Mapping from the request's utility hints to project tokens (raw values only in `tokens.css`):

| Request intent | Project token |
|----------------|---------------|
| `rgba(17,17,19,0.9)` + `blur(12px)` | `--bg-navbar-glass`, `--blur-navbar` |
| `border-b border-white/10` | `--divider-subtle` |
| `max-w-6xl mx-auto px-4 py-3` | centered container, `max-width: 1080px`, horizontal/vertical padding via tokens/spacing |
| `bg-[#0a0a0c] border-t border-white/10 pt-12 pb-8` | `--bg-footer` (+ `--divider-subtle`) |
| `grid-cols-1 md:grid-cols-3 gap-8` | CSS grid, 1→3 columns media query |

## 1. Header structure & semantics

- Root `<header class="app-header">` spans the **full viewport width** and is `position: sticky; top: 0;`
  at the page's top chrome layer (see §4).
- Inside, a centered container row (`max-width: 1080px`, auto margins, padded) holds:
  - **Left**: brand logo (`BRAND_LOGO`) + `STUDIO_PROFILE.brand`.
  - **Right**: `<nav aria-label="Navegación principal">` with one link per `NAV_ITEMS` entry.
- Rendered **only on public routes** by `BaseLayout.astro` (`!isAdmin`). `/admin` hides it.

## 2. Header behavior & states

- **Pinned**: remains visible while scrolling; must not overlap or cover interactive page content/modals
  (§4).
- **Active link**: the destination matching the current route exposes `aria-current="page"` and an accent
  (gold) visual state; other links use the secondary text color with a gold hover/focus treatment.
- **Targets**: every nav link and the brand link (if made clickable) is ≥44px tall with a visible focus
  ring.
- **Responsive**: at 320px the brand and all three destinations remain usable with **no horizontal page
  scroll** (a wrapping single-row layout is acceptable; a compact menu is optional and, if added, must not
  require a new island).
- **Reduced motion**: hover/focus transitions are disabled under `prefers-reduced-motion: reduce`.

## 3. Footer structure & semantics

- Root `<footer>` is an **independent, full-width** section on `--bg-footer` with a top divider
  (`--divider-subtle`), generous vertical padding.
- Inside, a centered container with a **CSS grid** of three groups:
  1. **Brand + description**: logo/wordmark + a short studio description.
  2. **Quick links / socials**: Instagram and WhatsApp links with clean icons; external links use
     `target="_blank" rel="noopener noreferrer"` and ≥44px targets.
  3. **Credits**: the FORGE Labs signature/credit line, elegantly aligned.
- A bottom line carries the brand and current year.
- **Responsive**: 1 column on narrow viewports → 3 columns from a medium breakpoint, with **no horizontal
  page scroll**.
- The footer renders on **public routes only**; `/admin` uses its own shell (see admin-shell-contract).

## 4. Stacking contract (shared with admin shell)

- Layer tokens: `--z-header: 30`, `--z-overlay: 40`, `--z-modal: 41` (existing overlays are 40–42).
- `<main>` MUST NOT establish a stacking context that traps overlays (no numeric `z-index`); the decorative
  canvas and top gradient stay at layer `0` so `<main>` paints above them by DOM order.
- **Invariant**: existing modals/drawers (booking success panel, cart drawer, admin modals) paint **above**
  the sticky header and any sidebar. The header MUST NOT cover an open overlay.

## 5. Invariants

- Public routing and the rendered navigation targets are unchanged.
- No new island/hydration is introduced for header or footer.
- Raw color/radius/shadow values appear only in `tokens.css`.
