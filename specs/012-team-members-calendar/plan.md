# Implementation Plan: Team Members Module, Monthly Admin Calendar & Mobile UX

**Branch**: `012-team-members-calendar` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-team-members-calendar/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Three cohesive improvements delivered on top of the existing hybrid data layer, with **no new runtime
dependency**:

1. **Team / Staff module** — a new first-class domain entity `TeamMember` (name, role, avatar, bio,
   Instagram handle, active flag, created timestamp). Extend the `DataStore` contract with
   `listTeamMembers` / `createTeamMember` / `updateTeamMember` / `deleteTeamMember`, backed by
   `localStorage` (`alpi:team:v1`, demo) and the new **`public.team_members`** table (production,
   migration `0006_team_members.sql`, RLS: public read of active rows, authenticated write). The landing
   gains a Dark-Luxury **"Nuestro Equipo / Artistas"** island (`client:visible`) that reads the managed
   data, and the admin panel gains an **Equipo** tab (list + create/edit + avatar upload + activate/
   deactivate + delete), mirroring the existing Inventario/Servicios patterns.
2. **Monthly admin calendar** — replace the weekly time-matrix in `AdminCalendar.svelte` with an
   **interactive monthly grid** (desktop ≥768px): 7 columns (Monday–Sunday), day cells with appointment
   count/status badges, and a day-detail that lists the selected day's appointments with the existing
   approve / cancel / reschedule actions (delegated to `src/lib/services/booking.ts`) plus time-block
   create/delete. On `<768px` it becomes a **horizontal day selector + vertical appointment list** with a
   clear service breakdown (no table overflow).
3. **Mobile shell & layout hardening** — a smooth hamburger drawer for the public navigation
   (`MobileNav.svelte`, `client:load`) and internal padding/overflow fixes in `CatalogGrid`,
   `CartDrawer`, `ProductCard` and the `BookingFlow` checkout so nothing scrolls horizontally down to
   320px.

Existing booking, calendar, catalog and services behavior is preserved; money stays integer cents and
appointment transitions keep going through the domain service.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**No new dependencies** (monthly grid is a custom CSS grid; no calendar library).

**Storage**: Supabase Postgres (production) / browser `localStorage` (demo). New table
`public.team_members(id uuid pk default gen_random_uuid(), name text, role text, avatar_url text,
bio text, instagram_handle text, is_active boolean, created_at timestamptz)` with migration
`0006_team_members.sql` (RLS: public `SELECT where is_active = true`; authenticated all). Team avatar
images reuse the existing public `products` Storage bucket via a generalized upload helper. Bookings,
products, services and time_blocks are unchanged.

**Testing**: `npx astro check` (type gate, **zero errors** — explicit user requirement), `npm run build`,
`npm run lint`, and the manual scenarios in `quickstart.md`. No unit-test runner is installed.

**Target Platform**: Static web (`output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: 60fps microinteractions; the monthly grid renders a single month (≤42 day cells)
from one data pass and scrolls internally without page-level layout thrash; the team section hydrates
when visible; no horizontal page scroll at any width.

**Constraints**: No Tailwind; token-driven styling + scoped CSS (`design-system.md` is binding); components
MUST NOT call Supabase directly (all access through the shared `dataStore` / domain services); integer
cents and the 50% deposit are untouched; appointment status transitions only through
`src/lib/services/booking.ts`; existing booking/calendar/catalog/services behavior preserved; `astro check`
zero errors.

**Scale/Scope**: Single-studio site. A handful of team members; a month of appointments (tens to low
hundreds). Scope = data layer + migration + supabase types + one landing island + one admin tab + calendar
redesign + header/mobile CSS. WhatsApp/cart/booking logic otherwise unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `constitution.md` v1.1.0 (supreme) and `.specify/memory/constitution.md`; `design-system.md`
is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Static-First & Islands of Interactivity | PASS (with budget note) | One new island: `TeamSection.svelte` (`client:visible`, below-the-fold content) and one new `MobileNav.svelte` (`client:load`, above-the-fold interactive nav). The calendar and admin team CRUD live inside the existing `AdminPanel` `client:load` island — no extra hydration. |
| 2. Token-Driven Styling (Zero Tailwind) | PASS | All new UI consumes existing tokens (cards, inputs, badges, `--overlay-backdrop`, `--z-*`). A new token is added to `tokens.css` **first** only if the design requires one. |
| 3. Type-Safe by Default | PASS (with action) | `TeamMember` / `NewTeamMemberInput` added to `src/lib/types/domain.ts`; `DataStore` extended; `src/types/supabase.ts` gains the `team_members` table; adapter rows narrowed (no `any`); `astro check` zero errors. |
| 4. Booking & Financial Integrity | PASS | No money fields in team. Month/day views read existing bookings; approve/cancel/reschedule keep using `services/booking.ts` and the store, so slot exclusivity and status rules are unchanged. |
| 5. Mobile-First, Accessible & Zero Overhead UX | PASS | Calendar gets a dedicated `<768px` layout (day strip + list); header gains an accessible drawer; labeled controls, visible focus, ≥44px targets, reduced motion; no horizontal scroll 320–1920px. |
| Data Access (Workflow) | PASS | Components read/write only through `dataStore` and domain services; Supabase stays in `src/lib/data/adapters/`; avatar upload goes through `src/lib/services/storage.ts`. |
| Schema Control (Workflow) | PASS | The new table ships as `0006_team_members.sql` and is reflected in `src/types/supabase.ts` before UI wiring. |
| Design Parity (Workflow) | PASS | `design-system.md` documents the new Team section and mobile drawer; any new token is authored in `tokens.css` first. |

**Gate result**: PASS with no unjustified violations. Island budgets are justified above.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| 1. Islands | PASS | Contracts confirm exactly two new islands; the calendar/day-detail and team CRUD remain children of the existing `AdminPanel` island. |
| 2. Token-Driven | PASS | `team-ui`/`calendar-ui`/`responsive-ui` contracts forbid raw values; reuse `.input`/`.field`, card and status tokens. |
| 3. Type-Safe | PASS | `team-data-contract` fixes the `DataStore` signatures and validation; `calendar-ui` fixes month-helper signatures; `astro check` is the gate. |
| 4. Integrity | PASS | `booking.ts` remains the only transition boundary; calendar contracts reuse it verbatim; no money math changes. |
| 5 / Data Access / Schema Control | PASS | `/contracts/*` + `data-model.md` + migration `0006` + supabase-type update precede UI; internal mobile scroll only, page never scrolls horizontally. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/012-team-members-calendar/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── team-data-contract.md
│   ├── team-ui-contract.md
│   ├── calendar-ui-contract.md
│   └── responsive-ui-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── team/
│   │   └── TeamSection.svelte        # NEW: public landing "Nuestro Equipo" island (client:visible)
│   ├── admin/
│   │   ├── AdminPanel.svelte         # MODIFY: add "Equipo" tab (list + CRUD + avatar upload)
│   │   └── AdminCalendar.svelte      # MODIFY: monthly grid (desktop) + day strip/list (mobile)
│   ├── catalog/
│   │   ├── CatalogGrid.svelte        # MODIFY: small-screen padding/overflow
│   │   ├── ProductCard.svelte        # MODIFY: min-width:0 + wrapping
│   │   └── CartDrawer.svelte         # MODIFY: responsive width/padding, no overflow
│   ├── booking/
│   │   └── BookingFlow.svelte        # MODIFY: checkout padding/overflow at 320px
│   └── ui/
│       ├── AppHeader.astro           # MODIFY: desktop nav only (hidden <768px) + mount MobileNav
│       └── MobileNav.svelte          # NEW: accessible hamburger drawer island (client:load)
├── lib/
│   ├── data/
│   │   ├── store.ts                  # MODIFY: listFallbackTeamMembers()
│   │   ├── team.ts                   # NEW: demo seed TEAM_MEMBERS (static data collection)
│   │   └── adapters/
│   │       ├── local.ts              # MODIFY: team CRUD (alpi:team:v1) with validators
│   │       └── supabase.ts           # MODIFY: team_members CRUD (typed rows)
│   ├── services/
│   │   └── storage.ts                # MODIFY: generalize upload helper (avatar upload)
│   ├── types/domain.ts               # MODIFY: TeamMember, NewTeamMemberInput; DataStore additions
│   └── utils/calendar.ts             # MODIFY: month helpers + per-day status summary
├── pages/
│   └── index.astro                   # MODIFY: mount <TeamSection client:visible />
└── styles/tokens.css                 # MODIFY (only if a new token is required)
src/types/supabase.ts                 # MODIFY: add team_members table types
supabase/
└── migrations/
    └── 0006_team_members.sql         # NEW: team_members table + RLS + grants
design-system.md / README.md          # MODIFY: document the Equipo section, monthly calendar and mobile nav
```

**Structure Decision**: Single-project Astro/Svelte layout. The team entity follows the constitution's
"domain entities in `src/lib/types/`, static data collections in `src/lib/data/`" split (`TeamMember`
type in `types/domain.ts`, demo seed in `data/team.ts`) rather than mirroring `services.ts`. The calendar
stays a child component of the single `AdminPanel` island; only the landing team section and the header
drawer add islands, both budget-justified.

## Complexity Tracking

> Deviations from the constitution that are justified here.

**None** — the design introduces no constitution violations. Three deliberate, documented trade-offs:

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| Team avatars reuse the existing public `products` Storage bucket via a generalized `uploadImage(file, prefix)` helper. | Avoids a second bucket + its policies/grants in migration `0006`; the existing bucket is already public-read + authenticated-write and paths are namespaced (`team-…`). | A dedicated `avatars` bucket: cleaner naming but adds storage-policy surface for no functional gain in a single-studio app. |
| New `MobileNav.svelte` island is `client:load` (header is above the fold on every public page). | A drawer needs client JS; the header is visible immediately, so `client:visible` would not apply. | Inline `<script>` in `AppHeader.astro`: contradicts "JS only in Svelte islands" (the existing image-fallback script is a narrow progressive-enhancement exception). |
| Month/day helpers extend the existing `src/lib/utils/calendar.ts`; now-unused weekly geometry helpers may be pruned. | Keeps all framework-agnostic calendar math in one testable module (feature 006 precedent). | A new `calendar-month.ts`: fragments calendar logic across files for no benefit. |
