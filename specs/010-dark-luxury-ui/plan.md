# Implementation Plan: Dark Luxury UI Redesign

**Branch**: `010-dark-luxury-ui` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-dark-luxury-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Restructure and refine the public and admin surfaces into a cohesive **Dark Luxury** layout while
changing **no** data, routing or booking behavior:

1. Replace the floating glass capsule header with a **full-width sticky top bar** (brand left,
   navigation right) sharing the same glassy dark surface.
2. **Compact, refined form controls** via the shared `.input`/`.field` system (shorter height, refined
   dark surface, defined border, soft gold focus ring).
3. Rebuild the footer as an **independent three-column section** (brand + description · social/links ·
   FORGE Labs credits), stacking on small screens.
4. Replace the admin top bar + loose tab buttons with a **dashboard shell**: a fixed left sidebar
   (brand, vertical Calendario/Inventario nav with a gold active state, user info + logout at the
   bottom) and a spacious main content area; the sidebar becomes a **collapsible drawer** on small
   screens.

Everything is achieved with the existing token system and scoped component styles (no Tailwind, no new
islands, no new libraries). The one structural plumbing change is the page stacking model, so that the
higher header and the admin sidebar never cover existing modals/drawers.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `lucide-svelte` (icons), `open-props` (via `tokens.css`).
No new dependencies.

**Storage**: N/A — presentation/layout only. The hybrid data layer, `DataStore` and domain services are
untouched.

**Testing**: `npx astro check` (type gate, zero errors — explicit user requirement), `npm run build`,
`npm run lint`, and the manual scenarios in `quickstart.md`. No unit-test runner is installed.

**Target Platform**: Static web (Astro `output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + Svelte islands); no separate backend.

**Performance Goals**: Preserve the island budget (no new `client:*`); sticky header/sidebar use cheap
composited effects; 60fps interactions; no layout thrash; no cumulative-layout-shift from the sticky bar.

**Constraints**: No Tailwind; all styling via `tokens.css` tokens + scoped `<style>`; components must not
change data-access behavior; touch targets ≥44px; visible focus; `prefers-reduced-motion` honored; public
copy in Spanish.

**Scale/Scope**: One public header, one public footer, the shared form-control system, and one admin
shell. Scope is limited to the four surfaces described in the spec; booking/catalog/admin functionality is
preserved verbatim.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `constitution.md` v1.1.0 (supreme) and `.specify/memory/constitution.md`.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS | No new islands, no new `client:*`. `AppHeader.astro`/`Footer.astro` stay static; `AdminPanel` keeps its single `client:load`. |
| II. Token-Driven Styling (Zero Tailwind) | PASS (with action) | The request's utility-class/hex hints are translated into new/existing **tokens** in `tokens.css` (form-control surface/border/height/focus, navbar glass, footer surface, z-layers) and mirrored in `design-system.md`. No utility framework; raw values only in `tokens.css`. |
| III. Type-Safe by Default | PASS | No domain types change. Astro active-nav uses `Astro.url.pathname` (string); Svelte drawer state uses runes. No `any`. `npx astro check` MUST pass with zero errors. |
| IV. Booking & Financial Integrity | PASS | No money/slot/status logic is touched; the domain service and adapters are unchanged. |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | Header/nav/sidebar keep ≥44px targets, labeled controls and visible focus; sidebar collapses to an accessible drawer; transitions honor reduced motion; layouts must not introduce horizontal scroll 320–1920px. |
| Data Access (Workflow) | PASS | No data access is added to components. |
| Schema Control (Workflow) | PASS | No collection/schema/type changes. |

**Gate result**: PASS with one documented structural change (page stacking model) covered in Complexity
Tracking; no unresolved violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| II. Token-Driven Styling | PASS | Contracts require `var(--token)` only; new tokens are added to `tokens.css` first and mirrored in `design-system.md`. |
| III. Type-Safe | PASS | No type changes; `astro check` remains the gate. |
| V. Mobile/Accessible | PASS | Drawer focus/aria, 44px targets, reduced-motion, 320px no-scroll are explicit contract clauses. |
| I. Islands | PASS | Confirmed: only existing islands; header/footer are static Astro. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/010-dark-luxury-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (UI structural model; no persistence)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── public-shell-contract.md
│   ├── form-controls-contract.md
│   └── admin-shell-contract.md
├── checklists/
│   └── requirements.md  # (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/
│   │   └── AppHeader.astro          # MODIFY: capsule → full-width sticky bar; active nav state
│   ├── Footer.astro                 # MODIFY: 3-column responsive footer section
│   └── admin/
│       └── AdminPanel.svelte        # MODIFY: top bar/tabs → sidebar + main dashboard shell
│                                    #         (mobile drawer, gold active state, user + logout)
├── layouts/
│   └── BaseLayout.astro             # MODIFY: stacking model; hide public footer on /admin
├── styles/
│   └── tokens.css                   # MODIFY: form-control tokens, navbar glass, footer surface,
│                                    #         z-layer tokens (raw values only here)
└── lib/
    └── types/content.ts             # REUSE: NAV_ITEMS (labels/hrefs) — no change required

design-system.md                     # MODIFY: document header, footer, form controls, admin shell
README.md                            # MODIFY (optional): describe the new shell/footer
```

**Structure Decision**: Single-project Astro/Svelte layout. No new modules are introduced; the feature
modifies the two static shell components (`AppHeader.astro`, `Footer.astro`), the admin island
(`AdminPanel.svelte`), the global layout (`BaseLayout.astro`) and the token layer (`tokens.css`), and
updates the design documentation.

## Complexity Tracking

> Deviations from the constitution that are justified here.

| Violation / Tension | Why Needed | Simpler Alternative Rejected Because |
|---------------------|------------|--------------------------------------|
| Removing `<main>`'s `z-index` stacking context (and lowering the top gradient to layer 0) so the higher sticky header can sit **below** existing overlays (modals/drawers at z 40–42). | A full-width sticky header at the requested high layer, inside the current model where `<main>` owns a stacking context, would paint **above** every modal/drawer rendered inside `<main>` (spec edge case: overlays must stay on top). Removing the context lets overlays win while content stays below the header. | Keeping `<main>` as a stacking context and only raising overlay z-indexes inside it would have no effect above the header; lowering the header below `<main>` would let page content scroll over it (unusable sticky navigation). |
| Hiding the public footer on `/admin`. | The dashboard shell (full-height sidebar + main) reads as a distinct workspace; the public marketing footer competes with it (spec assumption: admin keeps its own shell). | Keeping the footer below a `h-screen` sidebar produces an awkward scroll/height interaction and mixed contexts. |

## Execution Flow (per /speckit.plan)

- **Phase 0**: resolve unknowns → `research.md`.
- **Phase 1**: derive `data-model.md` (UI structural model), `contracts/` (UI contracts), `quickstart.md`.
- **Phase 2**: `/speckit.tasks` generates `tasks.md` (not here).
