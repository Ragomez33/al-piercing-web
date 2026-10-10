# Implementation Plan: Alternative Setmore-Style Landing Page (Dark Luxury)

**Branch**: `013-landing-v2` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-landing-v2/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add a **second, alternative landing page** at `/landing-v2` that mirrors the minimalist,
single-scroll profile architecture of Setmore booking pages (like `ronapiercing.setmore.com`) while
reusing the existing **ALPIERCING Dark Luxury** design language. The page is delivered as:

1. **Static profile header** (SSR in `landing-v2.astro`): studio logo/avatar (`BRAND_LOGO` +
   `STUDIO_PROFILE`), short description, address/opening hours, Instagram + WhatsApp links and a
   **"Reservas Online 24/7"** status badge.
2. **One new interactive island** — `src/components/landing/LandingV2Tabs.svelte` (`client:load`) —
   providing quick tabs to switch between **Servicios**, **Equipo** and **Proceso & Galería**:
   - *Servicios*: grouped-by-category list (managed data via `dataStore.listServices()`), each row with
     duration, price, a "Requiere seña" badge and an **`/booking?service=<id>`** booking action.
   - *Equipo*: embeds the existing `src/components/team/TeamSection.svelte` component (active members).
   - *Proceso & Galería*: the existing `PROCESS_STEPS` + `GALLERY_ITEMS` static content.
3. **No data-layer/schema changes** — the page is a presentation layer over the existing hybrid data
   store (`services`, `team`) and static content (`content.ts`).

The current landing (`src/pages/index.astro`) is left **untouched** so both variants coexist for
comparison. No new runtime dependency is added.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**No new dependencies**.

**Storage**: Reuses the existing hybrid data layer (`src/lib/data/store.ts` → `dataStore`): Supabase
Postgres (production) / browser `localStorage` (demo). This feature adds **no tables, no migrations and
no `DataStore` methods**; it only reads `listServices()` and the team reads inside `TeamSection`. Static
page content (profile, process, gallery) comes from `src/lib/types/content.ts` and `src/lib/config.ts`.

**Testing**: `npx astro check` (type gate, **zero errors** — explicit user requirement), `npm run build`,
`npm run lint`, plus the manual scenarios in `quickstart.md`. The project has no unit-test runner.

**Target Platform**: Static web (`output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: 60fps interactions; tab switching is pure client state (no network on switch);
services load once on mount; the new island adds minimal JS (tabs + service list only) and hydrates
immediately because the tab control sits near the top of the page.

**Constraints**: No Tailwind; token-driven styling + scoped CSS (`design-system.md` is binding);
components MUST NOT call Supabase directly (all access through `dataStore`); integer cents and the 50%
deposit are untouched; existing pages/routes/behavior preserved; current landing `index.astro`
unchanged; `astro check` zero errors.

**Scale/Scope**: Single-studio site. A handful of services and team members. Scope = one new page, one
new island, CSS only. No admin/booking/catalog logic changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `.specify/memory/constitution.md` (v1.0.0); `design-system.md` is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Static-First & Islands of Interactivity | PASS (with budget note) | `landing-v2.astro` is static HTML; exactly **one** new island (`LandingV2Tabs`, `client:load`) owns the tab switching + service list. `TeamSection.svelte` is imported as a child of that island (not hydrated twice). |
| 2. Token-Driven Styling (Zero Tailwind) | PASS | All new UI consumes existing tokens (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`, `--shadow-glow`, layer tokens). No new tokens required; no raw hex in components. |
| 3. Type-Safe by Default | PASS | Reuses existing `PiercingService`, `TeamMember`, `ProcessStep`, `GalleryItem`, `StudioProfile` types; island props typed; `astro check` zero errors; no `any`. |
| 4. Booking & Financial Integrity | PASS | The page only *reads and displays* service price/deposit; the "Reservar" action deep-links to the existing booking flow. No money math, no status transitions, no slot logic. |
| 5. Mobile-First, Accessible & Zero Overhead UX | PASS | Responsive `clamp()` layout, 320–1920px no horizontal scroll, ≥44px targets, semantic tabs with proper ARIA + keyboard support, visible focus, reduced motion honored. |
| Data Access (Workflow) | PASS | The island reads services only through `dataStore.listServices()`; no direct Supabase calls; demo fallback via `listFallbackServices()`. |
| Schema Control (Workflow) | PASS | No schema/data changes → nothing to migrate. |
| Design Parity (Workflow) | PASS | `design-system.md` is updated to document the alternative landing page and its tab island. |

**Gate result**: PASS with no unjustified violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| 1. Islands | PASS | Contract confirms one island; service list, team and process/gallery render inside it without extra hydration. |
| 2. Token-Driven | PASS | `landing-v2-ui-contract` forbids raw values; reuses card/pill/badge/tab tokens. |
| 3. Type-Safe | PASS | The contract fixes the island prop shape and reused entity types; `astro check` is the gate. |
| 4 / Data Access / Schema Control | PASS | Read-only over `dataStore`; booking delegated to `/booking?service=`; no schema surface. |
| 5 | PASS | Internal tab content area never scrolls the page horizontally; tabs are keyboard-operable with ≥44px. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/013-landing-v2/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── landing-v2-ui-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── landing/
│       └── LandingV2Tabs.svelte      # NEW: tabs island (client:load) — Servicios/Equipo/Proceso & Galería
├── pages/
│   ├── index.astro                   # UNCHANGED (current landing, kept for comparison)
│   └── landing-v2.astro              # NEW: alternative landing (SSR profile header + Mount island)
├── components/team/TeamSection.svelte  # REUSED (imported as a child of the island)
├── lib/types/content.ts               # REUSED (STUDIO_PROFILE, PROCESS_STEPS, GALLERY_ITEMS, NAV_ITEMS)
├── lib/config.ts                      # REUSED (BRAND_LOGO, WHATSAPP_PHONE)
└── lib/data/store.ts                  # REUSED (dataStore.listServices + listFallbackServices)
design-system.md                       # MODIFY: document the alternative landing + tab island
README.md                              # MODIFY: add the /landing-v2 route to the module table
```

**Structure Decision**: Single-project Astro/Svelte layout. The page shell is a static Astro file
(profile header, section wrapper) and the only interactive surface is one Svelte island that owns the
tab state and the grouped service list; the existing `TeamSection.svelte` and static content collections
are reused rather than duplicated. A new `components/landing/` folder keeps this variant isolated from
the current landing's inline markup.

## Complexity Tracking

> Deviations from the constitution that are justified here.

**None** — the design introduces no constitution violations. One deliberate, documented trade-off:

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| `TeamSection.svelte` is imported as a **child component** of the tabs island instead of being mounted as its own `client:visible` island on `/landing-v2`. | The tab panel must show/hide the team synchronously; a nested island would hydrate independently and complicate visibility control. It also avoids a second hydration on the same page. | A second `client:visible` island toggled via CSS/`class:hidden`: extra hydration + fragile cross-island visibility coordination. |
