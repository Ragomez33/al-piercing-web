# Quickstart: Landing Page & Base Layout

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

Runnable validation guide for the feature. Implementation details live in `tasks.md`.
Contracts: [UI contract](./contracts/ui-contract.md) · Model: [data model](./data-model.md).

## Prerequisites

- Node.js ≥ 22 (verified: v24.21.0), `npm` ≥ 11.
- Dependencies installed: `npm install` at repository root (Astro, `@astrojs/svelte`,
  `open-props`, `lucide-svelte`).
- Feature files present:
  - `src/styles/tokens.css`
  - `src/layouts/BaseLayout.astro`
  - `src/components/ui/AppHeader.astro`
  - `src/components/canvas/InkBackgroundCanvas.svelte`
  - `src/pages/index.astro`

## Setup & Commands

```bash
# 1. Install (if not already done)
npm install

# 2. Type-level validation (must exit 0, zero errors)
npx astro check

# 3. Production build (must generate the site with zero errors)
npm run build

# 4. Run locally
npm run dev   # open http://localhost:4321
```

## Validation Scenarios

### S1 · Hero & dual CTA (FR-001, FR-002, SC-001, SC-002)
1. Open `/` and confirm hero renders: stylized headline, short studio bio, studio location.
2. `Reservar Turno (50% Seña)` navigates to `/booking`.
3. `Ver Catálogo de Joyería` navigates to `/catalog`.
4. First-time visitor can identify the specialty and booking path within ~5s.

### S2 · Featured gallery (FR-007)
1. Confirm exactly 4 featured preview cards are rendered with the card visual style
   (charcoal surface, thin border, 16px radius, deep shadow).
2. Temporarily remove one image source → card shows a placeholder and grid stays intact.

### S3 · Process block (FR-008)
1. Confirm 3 cards appear in order: Consulta y Diseño → Reserva con Seña (50%) →
   Perforación y Cuidados, each with a short description.

### S4 · Shell shared across pages (FR-003)
1. Visit `/`, `/catalog` and `/booking`: each renders the gold-sheen gradient top layer, the
   centered brand and the Inicio / Catálogo / Reservar links.

### S5 · Responsiveness (FR-009, SC-005)
1. Check no horizontal scroll at 320px, 375px, 768px, 1280px and 1920px viewports.
2. Verify hero CTA stack/flow correctly on small widths (touch targets ≥ 44px).

### S6 · Ink background behavior (FR-005, FR-006, SC-004, SC-007)
1. Confirm a subtle ink motion animates in the top region without covering content.
2. Enable OS reduced motion → animation renders a static frame (no continuous motion).
3. On a mid-range device, scrolling and tap interactions remain smooth (target 60fps).

### S7 · No-JS fallback (FR-010)
1. Disable JavaScript, reload `/`: all sections and CTA links remain visible and usable;
   the background is simply absent/static.

## Expected Overall Outcome

`astro check` and `npm run build` exit 0; all S1–S7 scenarios pass on the agreed viewport
range (320–1920px); no horizontal scroll; reduced motion honored.