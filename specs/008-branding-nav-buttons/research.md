# Research: Icon Branding, Navigation & Button System

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 0 (Outline & Research)
Asset clarification: `public/images/logo.png` (2026-10-07).

## 1. Logo Asset & Centralized Path

- **Decision**: `public/images/logo.png` is the brand icon. `src/lib/config.ts` exports
  `BRAND_LOGO = "/images/logo.png"`; all surfaces read that constant.
- **Rationale**: One source of truth for the asset path; Astro serves `public/` at the site root.
- **Alternatives considered**: copying to `public/icon.png` + favicon references (`/icon.png`) — the
  file already lives at `images/logo.png`; an extra copy is unnecessary.

## 2. Hiding the Public Nav on `/admin`

- **Decision**: `BaseLayout` computes `isAdmin = Astro.url.pathname.startsWith(ADMIN_PREFIX)` in the
  frontmatter and renders `<AppHeader />` only for public routes.
- **Rationale**: All pages render through `BaseLayout`; the route is statically known at build time,
  so no client JS is needed. The admin panel already provides its own header (feature 005).
- **Alternatives considered**: an island reading `location.pathname` (unnecessary JS); duplicating
  headers per page (breaks consistency).

## 3. Docked Glass Capsule Public Nav

- **Decision**: `AppHeader.astro` wraps brand + logo (left) and the nav links into a centered pill
  `.dock` using new tokens: `--bg-navbar-glass rgba(17,17,19,0.85)`,
  `--blur-navbar 16px`, `--border-glass rgba(255,255,255,0.08)`, `--shadow-dock
  0 10px 30px -10px rgba(0,0,0,0.5)`, `border-radius: var(--radius-pill)`, `max-width: 650px`,
  `margin-top: 1rem`. Static Astro (no `client:`), wraps gracefully at 320px.
- **Rationale**: Matches the requested dock aesthetic while staying zero-JS; blur is scoped to one
  small element.
- **Alternatives considered**: `position: fixed` full-width bar (not the pill look requested).

## 4. Logo Blend on Dark Surfaces

- **Decision**: In the dock and footer, the logo gets `mix-blend-mode: screen` (with `object-fit:
  contain`), so a white/light background vanishes and the gold emblem reads on dark glass. If the
  browser lacks blend support the plain image remains (no layout break).
- **Rationale**: Requested explicitly; screen blend is the standard trick for white-background
  logos on dark UI. Applied only to the two dark surfaces (dock, footer), not the admin header (which
  sits on charcoal cards where the logo is already visible).
- **Alternatives considered**: replacing the logo background via JS canvas (overkill).

## 5. Button System — Component Mapping

- **Decision**: Tokenized primary/secondary styling, applied to:
  - **Primary** (`--accent-primary` bg, `--accent-on` text, weight 600/700, `--radius-btn` 12px,
    hover `translateY(-1px)` + `--glow-btn-primary`): index `.cta-primary`, BookingFlow `.submit`,
    CartDrawer `.checkout` and `.pay-opt.active`, Admin `.primary`.
  - **Secondary** (`--bg-btn-secondary`, `--border-btn-secondary`, hover gold border): index
    `.cta-secondary`, CartDrawer clear/pay-opt, Admin `.ghost`, Calendar `.ghost`.
  - **Keep pill radius** (9999px) for: navigation links, FAB, slot pills, status badges/toggles —
    they are not action buttons in this system.
- **Rationale**: Consistent, brand-driven CTAs without rewriting every pill/control; the mapping is
  documented in the layout contract so rebuilds stay aligned.
- **Alternatives considered**: replacing everything (breaks the dock/nav/FAB look); leaving buttons
  untouched (fails FR-009/010).

## 6. Favicon & Mobile Icon Metadata

- **Decision**: `BaseLayout` head adds `<link rel="icon" type="image/png" href={BRAND_LOGO}>` and
  `<link rel="apple-touch-icon" href={BRAND_LOGO}>` alongside the existing `favicon.svg`/`.ico` (kept
  for legacy).
- **Rationale**: Fulfills FR-006 with the same centralized constant; retaining existing icons avoids
  regressions in cached clients.
- **Alternatives considered**: replacing the SVG/ICO files (risky; favored adding PNG links).

## 7. Admin Header Branding

- **Decision**: `AdminPanel` panel-head adds the logo image plus the title **"ALPIERCING Admin"**
  (replacing "Panel del Estudio"); the sign-out/email controls remain.
- **Rationale**: Distinct workspace identity (FR-007) without touching the auth flow.

## 8. Footer Mark

- **Decision**: `Footer.astro` renders a small (≈20px) logo image inline with the FORGE Labs
  attribution paragraph, using the same `BRAND_LOGO` constant and the screen blend for consistency.
- **Rationale**: FR-008; keeps the corporate signature read as one unit.

## Design-Token Note

New tokens (added first): `--bg-navbar-glass`, `--blur-navbar`, `--border-glass`,
`--border-glass-strong`, `--shadow-dock`, `--radius-btn 12px`, `--glow-btn-primary`,
`--bg-btn-secondary`, `--border-btn-secondary`, `--border-btn-secondary-hover`. No raw values in
components.