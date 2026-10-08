# Implementation Plan: Landing Page & Base Layout

**Branch**: `001-landing-page` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-landing-page/spec.md`

## Summary

Build the shared site shell (base layout, navigable header, decorative ink-motion
background) and the landing page (`index.astro`) with a Hero (dual CTA), the static
Setmore-style service menu (owned by feature 003), a 4-card featured gallery and a 3-step
process/trust block — rigorously applying the project's documented dark-premium design
tokens (`src/styles/tokens.css`, single source of truth). The shell is the foundation reused by
every future page; the landing page is the first consumer. Static-first with a single Svelte
island (the background canvas), zero Tailwind, strict TypeScript.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5 (runes)

**Primary Dependencies**: `@astrojs/svelte` (integration), `open-props` (token base for `tokens.css`), `lucide-svelte` (icons); `three` + `@types/three` are installed but **not required** for this feature (Canvas 2D chosen — see `research.md`)

**Storage**: None — display-only static content; no persistence for this feature

**Testing**: `astro check` (type-level validation) + `astro build` (production build gate) + manual browser checks (responsive widths, reduced-motion, no-JS fallback)

**Target Platform**: Modern evergreen browsers; mobile-first on mid-to-low-range devices

**Project Type**: Web application (static/marketing site + interactive islands)

**Performance Goals**: Background animation smooth at 60fps on a mid-range device; hero content visible within ~2s on a typical mobile connection; zero horizontal scroll from 320px to 1920px

**Constraints**: No Tailwind (token-only styling); scoped CSS; reduced-motion MUST be respected; JavaScript only inside islands; content MUST remain usable without the canvas or with JS disabled

**Scale/Scope**: One landing page + reusable shell (layout, header, background), including the static service menu. Destination routes (`/catalog`, `/booking`, `/admin`) exist as pages.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands of Interactivity**: PASS. Page renders as static HTML; the only `client:` directive is the background canvas as a leaf island (`client:only="svelte"`), justified as below-the-fold/ambient UI.
- **Principle II — Token-Driven Styling (Zero Tailwind)**: PASS. All styling consumes `tokens.css` custom properties; no raw hex in components; no utility framework.
- **Principle III — Type-Safe by Default**: PASS. Strict TS, no `any`; a typed content model in `src/lib/types/` backs the landing content.
- **Principle IV — Booking & Financial Integrity**: N/A. No money or booking data in this feature.
- **Principle V — Mobile-First, Accessible & Zero Overhead UX**: PASS. 60fps target, semantic markup, labeled CTAs, touch targets ≥ 44px, `prefers-reduced-motion` honored.
- **SDD — Design Parity**: PASS (tokens first). **Island Justification**: PASS (single ambient island, `client:only`).

**Post-Design Re-check (after Phase 1)**: PASS — all principles re-verified against the
designed artifacts (`research.md`, `data-model.md`, `contracts/ui-contract.md`):
- Content model stays typed and display-only (Principle III; no persistence added).
- Single Canvas 2D island replaces the heavier Three.js alternative (Principle I & V; see
  `research.md` §1).
- Tokens remain the only styling source; no utility framework introduced (Principle II).
- Reduced-motion, no-JS fallback and 320–1920px responsiveness are explicit contract
  requirements (Principle V).

No gate violations. **Complexity Tracking**: not applicable.

## Project Structure

### Documentation (this feature)

```text
specs/001-landing-page/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── canvas/
│   │   └── InkBackgroundCanvas.svelte   # ink-motion background island (Canvas 2D)
│   └── ui/
│       └── AppHeader.astro              # global header (brand centered + nav links)
├── layouts/
│   └── BaseLayout.astro                 # global shell: gradient layer, background, header
├── lib/
│   └── types/
│       └── content.ts                   # typed content model (see contracts/)
├── pages/
│   └── index.astro                      # landing page (hero + service menu + gallery + process)
└── styles/
    └── tokens.css                       # design tokens — single source of truth
```

**Structure Decision**: Single project following Astro conventions (per constitution §1.1).
Routes in `src/pages/`, shared shell in `src/layouts/`, islands in `src/components/`
(`canvas/` and `ui/` already scaffolded), typed domain/content layer in `src/lib/types/`.
The shell (layout + header + background) is intentionally shared so future modules
(`catalog`, `booking`, `admin`) reuse it unchanged.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no constitution violations.