# Implementation Plan: Managed Service Catalog (Admin CRUD + Booking)

**Branch**: `011-services-crud` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-services-crud/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Turn the piercing service menu into **managed data**, mirroring the catalog pattern:

- Extend the hybrid data layer with `services` operations (`listServices`, `createService`,
  `updateService`) backed by **localStorage** in demo mode and the **`public.services`** table in
  production, seeded with today's menu so behavior is unchanged initially.
- Add migration `0008_services.sql` (table `services`, RLS: public read of active rows, authenticated
  write) plus the `services` block in `src/types/supabase.ts`.
- Add a **Servicios** section to the admin shell (sidebar) with full CRUD: list (active + inactive),
  create, edit, and activate/deactivate. Soft-deactivate instead of hard delete.
- Make the public booking flow load services from the data layer (only active ones), with a
  loading/empty state and a **fallback to the seed menu** if the query fails (demo parity).
- Resolve booking slot durations from managed service data (booking flow + admin calendar) instead of a
  hardcoded constant.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
No new dependencies.

**Storage**: Supabase Postgres `public.services` (production) / browser `localStorage`
(`alpi:services:v1`, demo). New table: `services(id text pk, name text, category text check(...),
description text, price_cents integer ≥ 0, duration_minutes integer > 0, requires_deposit boolean,
active boolean, created_at timestamptz)`. RLS: public `SELECT` where `active = true`; authenticated
`SELECT` all + `INSERT`/`UPDATE`. Migration `0008_services.sql` also seeds the current menu idempotently.

**Testing**: `npx astro check` (type gate, zero errors — explicit user requirement), `npm run build`,
`npm run lint`, and the manual scenarios in `quickstart.md`. No unit-test runner is installed.

**Target Platform**: Static web (Astro `output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + Svelte islands); no separate backend.

**Performance Goals**: Service list loads with the page; perceived confirmation unchanged; 60fps UI; no
layout thrash; admin CRUD updates the list without a full reload.

**Constraints**: No Tailwind; token-driven styling + scoped CSS; components MUST NOT call Supabase
directly (data access via the shared `dataStore`); money as integer cents; deposit = 50% of price;
existing booking/calendar/catalog behavior preserved; `astro check` zero errors.

**Scale/Scope**: Single-studio menu (a handful of services). Scope = data layer + migration + admin
Servicios CRUD + booking menu wiring + duration resolution. WhatsApp/cart/calendar flows otherwise
unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `constitution.md` v1.1.0 (supreme) and `.specify/memory/constitution.md`.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS | No new islands; the Servicios CRUD lives inside the existing `AdminPanel` `client:load` island. The booking menu stays in `BookingFlow` (existing island). |
| II. Token-Driven Styling (Zero Tailwind) | PASS | New admin UI uses existing tokens (cards, inputs, badges); no raw values outside `tokens.css`. |
| III. Type-Safe by Default | PASS (with action) | Extends `PiercingService` (adds `active`) and adds `NewServiceInput`; extends the `DataStore` interface; updates `src/types/supabase.ts` for the `services` table. No `any`; `astro check` zero errors. |
| IV. Booking & Financial Integrity | PASS | Money stays integer cents; deposit stays 50%. Slot exclusivity/transition rules untouched; the booking snapshot (`serviceName`/`priceCents`) is preserved, so later service edits don't rewrite history. |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | Admin list/form use labeled controls, ≥44px targets, visible focus, reduced motion; empty/loading/error states; no horizontal scroll 320–1920px. |
| Data Access (Workflow) | PASS | Components read/write through the shared `dataStore`; no direct Supabase calls in `.svelte`. |
| Schema Control (Workflow) | PASS | The new table ships as migration `0008_services.sql` and is reflected in `src/types/supabase.ts` before UI wiring. |

**Gate result**: PASS with no unjustified violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| II. Token-Driven Styling | PASS | Admin Servicios contract forbids raw values; reuses `.input`/`.field` and card tokens. |
| III. Type-Safe | PASS | Contracts fix `NewServiceInput` fields, validation and the `listServices({ includeInactive })` signature; `astro check` is the gate. |
| IV. Integrity | PASS | Contract keeps integer cents and the 50% deposit; bookings remain snapshots. |
| Data Access / Schema Control | PASS | Single `dataStore` surface; migration `0008` + generated-type update precede UI. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/011-services-crud/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── services-data-contract.md
│   ├── admin-services-ui-contract.md
│   └── booking-menu-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── booking/
│   │   └── BookingFlow.svelte          # MODIFY: load active services from dataStore
│   │                                    #         (loading/empty/fallback states)
│   └── admin/
│       ├── AdminPanel.svelte           # MODIFY: add "Servicios" sidebar section + CRUD UI
│       └── AdminCalendar.svelte        # MODIFY: resolve durations from loaded services
├── lib/
│   ├── data/
│   │   ├── services.ts                 # MODIFY: add `active` to the seed; keep categories
│   │   ├── adapters/local.ts           # MODIFY: services localStorage CRUD (alpi:services:v1)
│   │   └── adapters/supabase.ts        # MODIFY: services table CRUD (typed rows)
│   └── types/domain.ts                 # MODIFY: extend PiercingService/DataStore; NewServiceInput
├── types/supabase.ts                   # MODIFY: add the `services` table types
supabase/
└── migrations/
    └── 0008_services.sql               # NEW: services table + RLS + seed
design-system.md / README.md            # MODIFY: document the Servicios section + hybrid source
```

**Structure Decision**: Single-project Astro/Svelte layout. No new modules beyond the migration; the work
modifies the data layer (adapters + types), the SQL schema/types, the admin island and the booking
island.

## Complexity Tracking

> Deviations from the constitution that are justified here.

| Violation / Tension | Why Needed | Simpler Alternative Rejected Because |
|---------------------|------------|--------------------------------------|
| `PiercingService` stays defined in `src/lib/data/services.ts` (not moved to `src/lib/types/`). | It is the existing shared type already imported by the adapters, booking and admin; adding `active`/`NewServiceInput` there avoids a cross-cutting type move that would touch many files for no behavior change. | Moving the type to `src/lib/types/` would be a larger refactor with higher regression risk and no user-visible benefit in this feature. |
| Demo/seed **fallback on query failure** in production (FR-012), in addition to the normal demo mode. | The user explicitly asked for "modo demo si la db no responde o da error"; a broken services query must not blank the booking menu. | Propagating the error to a blank screen would break the primary public flow. |
