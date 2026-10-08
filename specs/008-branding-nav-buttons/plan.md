# Implementation Plan: Icon Branding, Navigation & Button System

**Branch**: `008-branding-nav-buttons` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-branding-nav-buttons/spec.md`
(asset path clarified 2026-10-07: `public/images/logo.png`).

## Summary

Integrate the brand logo across the four surfaces (favicon/mobile metadata, public dock, admin
header, footer), separate the public navbar from the admin area, redesign the public navbar as a
centered dark-glass capsule dock, and introduce the Dark Gold primary/secondary button system.
All visual values go through new design tokens; everything else (data layer, auth, calendar) is
untouched.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5 (runes)

**Primary Dependencies**: None new — plain Astro components/CSS tokens.

**Storage**: N/A (visual feature; no data changes).

**Testing**: `astro check` (0/0) + `astro build` + manual scenarios in `quickstart.md`.

**Target Platform**: Modern evergreen browsers on static hosting; mobile-first.

**Project Type**: Web application (static pages + existing islands).

**Performance Goals**: The dock header stays a static Astro component (zero client JS); `backdrop-filter`
is limited to one small capsule; no new hydration.

**Constraints**: Tokens first (new tokens added to `tokens.css` before component use); public nav
hidden on `/admin`; the admin keeps its own header; buttons mapped consistently across public CTAs
while navigation pills/FABs keep the pill radius; `npx astro check` 0 errors/warnings.

**Scale/Scope**: UI-only. Touches `AppHeader`, `BaseLayout`, `Footer`, `AdminPanel`,
`BookingFlow`, `CartDrawer`, `tokens.css` and `config.ts`. No routes, no data, no migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands**: PASS. The docked navbar is a static Astro header (no
  `client:`); the admin header lives inside the existing `AdminPanel` island; no new hydration.
- **Principle II — Token-Driven Styling**: PASS. New tokens (glass surfaces, borders, shadows,
  button radius/glows) are added first; components consume `var(--token)` only.
- **Principle III — Type-Safe by Default**: PASS. `BRAND_LOGO`/`ADMIN_PREFIX` typed constants in
  `config.ts`; no runtime data.
- **Principle IV — Booking & Financial Integrity**: N/A (no money/booking logic changes).
- **Principle V — Mobile-First, Accessible**: PASS. Capsule wraps at 320px; targets ≥ 44px; visible
  focus; `mix-blend-mode`/backdrop have graceful fallbacks.

No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-branding-nav-buttons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/AppHeader.astro           # EDIT → docked glass capsule + logo (left)
│   ├── admin/AdminPanel.svelte      # EDIT → header: logo + "ALPIERCING Admin"; button tokens
│   ├── admin/AdminCalendar.svelte   # EDIT → primary/ghost buttons use token styles
│   ├── booking/BookingFlow.svelte   # EDIT → submit button primary style
│   ├── catalog/CartDrawer.svelte    # EDIT → checkout/pay-opt primary/secondary styles
│   └── Footer.astro                 # EDIT → small logo beside FORGE Labs attribution
├── layouts/BaseLayout.astro         # EDIT → hide public nav on /admin; favicon/apple-touch PNG links
├── lib/config.ts                    # EDIT → BRAND_LOGO ("/images/logo.png"), ADMIN_PREFIX ("/admin")
└── styles/tokens.css                # EDIT → glass dock + button tokens
public/images/logo.png               # existing asset; preserved as the brand icon
```

**Structure Decision**: All styling stays token-driven and component-scoped. The logo path is a
single config constant so the asset location is centralized. Route-based header hiding happens in
`BaseLayout` (all pages share it), using the static `Astro.url.pathname`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no violations.

**Post-Design Re-check (after Phase 1)**: PASS — `data-model.md`, the layout contract and
`quickstart.md` confirm: public nav only on public routes; dock capsule values tokenized; logo used
consistently at the four surfaces; primary/secondary button mapping with pill/FAB exceptions; no raw
values in components.