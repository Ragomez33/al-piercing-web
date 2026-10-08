# Research: Landing Page & Base Layout

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 0 (Outline & Research)

## 1. Ink-Motion Background Technique

- **Decision**: Procedural **Canvas 2D** ink-flow — soft layered blobs with gentle
  noise/velocity displacement and additive blending, rendered inside a Svelte island.
- **Rationale**: Ambient full-page background with the smallest JS/asset footprint;
  runs on CPU with zero GPU dependency; uses the native canvas API (no extra runtime);
  predictable 60fps on mid-range devices by capping particle count and DPR scaling.
  Satisfies FR-005/FR-006 and aligns with Principles I and V.
- **Alternatives considered**:
  - Three.js WebGL shader (dependency already installed): richer fluid look and
    GPU-accelerated, but adds a full renderer lifecycle, heavier page cost and more
    failure surface on low-end GPUs for a subtle ambient effect. Rejected for v1;
    available for gallery/admin visuals later.
  - Static gradient only: cheapest, but fails FR-005 (subtle ink motion required).

## 2. Smooth Animation, Lifecycle & Reduced Motion

- **Decision**: Single `requestAnimationFrame` loop inside the island; pause on
  `document.visibilitychange` / `window` blur; clamp `devicePixelRatio` (max 2); cap
  particle count; when `matchMedia('(prefers-reduced-motion: reduce)')` matches, render a
  static first frame and stop the loop.
- **Rationale**: rAF is display-refresh aligned (60fps target); pausing when the tab is
  hidden preserves battery; honors FR-006 and SC-007 (reduced motion = no continuous
  animation).
- **Alternatives considered**: CSS-only animated gradient (no ink feel); `setInterval`
  physics (not frame-aligned, jank-prone).

## 3. Shared Shell: Layout & Header

- **Decision**: One static `BaseLayout.astro` composes the global shell — top gold-sheen
  gradient layer (first quarter of viewport), ink-background island slot, `AppHeader` and
  the page `slot` — plus an optional footer slot. `AppHeader.astro` is a presentational
  Astro component: brand name/logo centered over the gradient and quick links
  (Inicio, Catálogo, Reservar).
- **Rationale**: Astro layouts compose static HTML without client JS, keeping the header
  zero-island per Principle I; a single shared shell means future modules reuse it
  unchanged (constitution §1.1).
- **Alternatives considered**: Header as a client island (unneeded JS); header duplicated
  per page (maintenance duplication, defeats the shared-shell goal).

## 4. Content Sourcing & Typing

- **Decision**: Typed static content module `src/lib/types/content.ts` exporting the
  content model (`StudioProfile`, `GalleryItem[]`, `ProcessStep[]`, `NavigationItem[]`)
  as `const` values; image URLs reference local assets; representative placeholders until
  the studio supplies real media.
- **Rationale**: Enforces Principle III (explicit shared types), matches the spec
  assumption of no CMS in v1, and keeps content decoupled from markup so a future data
  layer can replace it without markup churn.
- **Alternatives considered**: Inline hardcoded sections (fast but untyped and harder to
  test/replace); PocketBase collections (unjustified persistence/latency for static
  marketing content).

## 5. Web UI Validation (no test framework installed)

- **Decision**: Three validation gates — `astro check` (types + Astro diagnostics),
  `astro build` (production build), and a documented manual scenario script in
  [`quickstart.md`](./quickstart.md) covering acceptance scenarios, viewport widths,
  reduced motion and no-JS behavior.
- **Rationale**: Matches current project maturity (no test framework); the scenario list
  is independently runnable and tech-agnostic per the spec's success criteria.
- **Alternatives considered**: Installing Vitest/Playwright now — scope creep for a static
  page; revisit when booking/cart flows require interaction tests.

## Design-Token Note

- **Decision**: All brand values come from `src/styles/tokens.css` (already defined per the
  documented palette). Any new color/radius/shadow MUST be added there before being used.
- **Rationale**: Constitution Principle II (Design Parity) — tokens are the single styling
  source of truth.
- **Alternatives considered**: None — token-first is a hard project rule.