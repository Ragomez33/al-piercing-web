# Layout & Components Contract: Icon Branding, Navigation & Button System

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Backed by [`data-model.md`](../data-model.md) and [`research.md`](../research.md).

## 1. Global Configuration

```ts
// src/lib/config.ts
export const BRAND_LOGO: string = "/images/logo.png";
export const ADMIN_PREFIX: string = "/admin";
```

## 2. Route-based Header Rendering (BaseLayout)

- In `BaseLayout` frontmatter: `const isAdmin = Astro.url.pathname.startsWith(ADMIN_PREFIX);`
- Render `<AppHeader />` only when `!isAdmin`. The admin area renders its own header inside the
  `AdminPanel` island (never the public one) — FR-001/FR-002.

## 3. Public Dock (`AppHeader.astro`, static, no `client:`)

- Structure: `.dock` pill with logo (left, `BRAND_LOGO`, alt "ALPIERCING logo") + nav links.
- Styles via tokens:
  - `background: var(--bg-navbar-glass)` (rgba(17,17,19,0.85))
  - `backdrop-filter: blur(var(--blur-navbar))` (16px)
  - `border: var(--border-glass)` (1px solid rgba(255,255,255,0.08))
  - `box-shadow: var(--shadow-dock)` (0 10px 30px -10px rgba(0,0,0,0.5))
  - `border-radius: var(--radius-pill)`, `max-width: 650px`, `margin-top: 1rem`, centered.
- Logo in the dock uses `mix-blend-mode: screen` + `object-fit: contain` (FR-005).

## 4. Admin Header (`AdminPanel.svelte`)

- panel-head: logo (`BRAND_LOGO`, ~32px) + **"ALPIERCING Admin"** title; the existing mode badge,
  operator email and `[Cerrar Sesión]` remain (FR-007).

## 5. Footer (`Footer.astro`)

- Inline small logo (≈20px, `BRAND_LOGO`, screen blend) next to the FORGE Labs attribution
  (FR-008).

## 6. Button System (tokenized)

| Class/target | Variant | Values |
| --- | --- | --- |
| `.cta-primary` (index), `.submit` (booking), `.checkout`/`.pay-opt.active` (cart), Admin `.primary` | primary | `background: var(--accent-primary)`; `color: var(--accent-on)`; `font-weight: 600`; `border-radius: var(--radius-btn)`; hover `transform: translateY(-1px)` + `box-shadow: var(--glow-btn-primary)` |
| `.cta-secondary` (index), cart clear/pay-opt, Admin `.ghost`, Calendar `.ghost` | secondary | `background: var(--bg-btn-secondary)`; `border: var(--border-btn-secondary)`; `border-radius: var(--radius-btn)`; hover `border: var(--border-btn-secondary-hover)` |
| Nav links, FAB, slot pills, status badges/toggles | pill (excluded) | keep `--radius-pill` (9999px) |

## 7. Metadata (BaseLayout head)

- Add both links with the constant: `<link rel="icon" type="image/png" href={BRAND_LOGO}>` and
  `<link rel="apple-touch-icon" href={BRAND_LOGO}>`; keep existing favicon svg/ico (FR-006).

## 8. Accessibility & Fallbacks

- Dock and buttons keep ≥ 44px targets and visible focus; `mix-blend-mode` and `backdrop-filter` have
  plain fallbacks (image still visible / opaque dark capsule); no horizontal page scroll at 320px.