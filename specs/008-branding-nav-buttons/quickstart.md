# Quickstart: Icon Branding, Navigation & Button System

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Contract: [layout & components](./contracts/layout-contract.md) · Model: [data model](./data-model.md).

Runnable validation guide. Implementation details live in `tasks.md`.

## Prerequisites

- Node.js ≥ 22, deps installed (`npm install`).
- Feature files: edited `src/components/ui/AppHeader.astro`, `src/layouts/BaseLayout.astro`,
  `src/components/Footer.astro`, `src/components/admin/AdminPanel.svelte`,
  `src/components/booking/BookingFlow.svelte`, `src/components/catalog/CartDrawer.svelte`,
  `src/lib/config.ts` and `src/styles/tokens.css`.
- Asset present: `public/images/logo.png`.

## Setup & Commands

```bash
npm install
npx astro check   # exit 0, zero errors
npm run build     # exit 0
npm run dev       # open http://localhost:4321
```

## Validation Scenarios

### S1 · Navigation separation (FR-001/002)
Open `/`, `/catalog`, `/booking` → the public dock (Inicio/Catálogo/Reservar) renders. Open `/admin`
→ the public dock does **not** render; the admin header (logo + "ALPIERCING Admin" + sign-out) does.

### S2 · Docked glass capsule (FR-003/004)
On any public page the navigation renders as a centered rounded capsule (max-width 650px, top offset,
pill radius, translucent dark glass with blur, subtle light border, soft shadow) — a dock, not ghost
text — and remains legible while scrolling.

### S3 · Logo in the dock (FR-005)
The brand logo appears at the left of the capsule, `object-fit: contain`, and a white background is
blended away (screen) so the gold emblem stays visible.

### S4 · Favicon & mobile icon (FR-006)
Inspect the page head: favicon PNG and apple-touch links resolve to `/images/logo.png`; the tab icon
and mobile shortcut use the brand logo.

### S5 · Admin header mark (FR-007)
On `/admin`, the panel header shows the logo next to the "ALPIERCING Admin" title, with the mode
badge, email and `[Cerrar Sesión]` still present.

### S6 · Footer mark (FR-008)
The global footer shows a small version of the logo inline with the FORGE Labs attribution.

### S7 · Primary buttons (FR-009)
The primary CTAs (index hero, booking submit, cart checkout, admin primary) use a gold fill, dark
text at weight 600, 12px radius; hover elevates (`translateY(-1px)`) and shows the gold glow.

### S8 · Secondary buttons (FR-010)
Secondary CTAs (index secondary, admin ghost, calendar ghost) use the translucent surface with the
thin light border; hover warms the border to gold.

### S9 · Gates & tokens (FR-011/013, SC-006)
`npx astro check` and `npm run build` finish with **zero errors and zero warnings**; a grep of `src/`
shows no raw hex/rgba outside `tokens.css`.

### S10 · Responsive & a11y (FR-012, SC-005)
No horizontal page scroll at 320–1920px; the dock wraps; targets ≥ 44px; visible focus; logo/focus
render fine if blur or blend is unsupported.

## Expected Overall Outcome

`astro check`/`build` exit 0; S1–S10 pass; public nav absent on `/admin`; the capsule dock and logo
are consistent on every public page; primary/secondary buttons follow the Dark Gold system.