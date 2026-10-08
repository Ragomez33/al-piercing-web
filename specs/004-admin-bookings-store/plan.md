# Implementation Plan: Admin Dashboard, Bookings & Hybrid Data Layer

**Branch**: `004-admin-bookings-store` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-admin-bookings-store/spec.md`

## Summary

Introduce a **single unified data layer** (`src/lib/data/store.ts`) that auto-detects the
environment: with no public backend configuration it runs in **demo mode** over `localStorage` +
seeded static content; with configuration present it talks to **Supabase**. Every module reads/writes
through this layer. On top of it, build the **admin dashboard** (PIN-gated, `bookings` + `catalog`
tabs) as a client island, and extend the **booking flow** to block slots occupied by active
bookings and to persist the reservation before opening WhatsApp with the 50% deposit / payment
details.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5 (runes)

**Primary Dependencies**: `@astrojs/svelte`, `lucide-svelte`, `open-props` + `tokens.css` (existing); **new**: `@supabase/supabase-js` (used only by the production adapter)

**Storage**: Two modes behind one interface — **demo**: browser `localStorage` (versioned keys seeded from static content); **production**: Supabase (Postgres) accessed with the public anon key via the JS client. No server runtime.

**Testing**: No test framework is installed (consistent with specs 001–003). Validation gates are `astro check` (0 errors/0 warnings), `astro build`, and the manual scenarios in `quickstart.md`. Unit-testing the adapters is deferred (documented in `research.md`).

**Target Platform**: Modern evergreen browsers on static hosting (output `static`).

**Project Type**: Web application (static pages + justified Svelte islands).

**Performance Goals**: Demo-mode reads/writes are synchronous-fast and must not block interaction; production reads on date selection stay single-query; no layout thrash; island count stays minimal.

**Constraints**: Token-only styling (Dark Premium); integer cents; a date+time slot is exclusive for active bookings; public build-time env vars only (never secrets in the client); components MUST delegate data access to the data layer (no direct backend calls in `.svelte`/`.astro`); external data (Supabase rows, `localStorage` JSON, form input) MUST be validated/narrowed before use.

**Scale/Scope**: Single studio; modest booking volume; 4 pages; 1 new admin island + 1 new catalog island + 1 extended booking island. No server, no real payment capture.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands of Interactivity**: PASS. Pages stay static; new
  interactivity is confined to leaf islands (`AdminPanel`, `CatalogGrid`) and the existing
  `BookingFlow`. Each `client:load` island is justified below. No full-page client app.
- **Principle II — Token-Driven Styling**: PASS. All new admin/catalog/booking UI consumes
  `tokens.css` variables; existing status colors (`--accent-positive/gold/negative`) are reused; no
  Tailwind; raw values only in `tokens.css`.
- **Principle III — Type-Safe by Default**: PASS. New shared types (`Booking`, `BookingStatus`,
  `ProductRecord`, `DataMode`) live under `src/lib/types/`; every adapter boundary narrows
  untrusted input; no `any`.
- **Principle IV — Booking & Financial Integrity**: PASS **with one justified deviation** — money is
  integer cents (deposit = `round(price/2)`); slot exclusivity is honored; but this feature blocks
  slots for **both `PENDING` and `CONFIRMED`** bookings, whereas constitution §IV (v1.0.0) states
  pending deposits must **not** block a slot. See Complexity Tracking for the justification.
- **Principle V — Mobile-First, Accessible**: PASS. Admin tables become cards on small screens;
  controls are labeled with ≥ 44px targets and visible focus; PIN gate is keyboard-accessible.
- **Data Access rule**: PASS. Components call `src/lib/data/store.ts` only; direct `supabase`/`fetch`
  usage is confined to `src/lib/data/adapters/`.

**Top-level deviations** (also tracked in Complexity Tracking): (a) the spec mandates **Supabase**
while the constitution's stack lists **PocketBase**; (b) soft-blocking `PENDING` slots. Both are
explicit user requirements and are justified there.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-bookings-store/
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
│   ├── admin/
│   │   └── AdminPanel.svelte        # NEW island (client:load): PIN gate + bookings/catalog tabs
│   ├── booking/
│   │   └── BookingFlow.svelte       # EXTENDED: read booked slots, persist booking, payment info
│   ├── catalog/
│   │   ├── CatalogGrid.svelte       # NEW island (client:load): store-driven, SSR fallback
│   │   ├── CartDrawer.svelte        # EXTENDED: consume store products
│   │   └── ProductCard.svelte
│   ├── canvas/InkBackgroundCanvas.svelte
│   └── ui/AppHeader.astro
├── layouts/BaseLayout.astro
├── lib/
│   ├── config.ts                    # env-overridable: WhatsApp, admin PIN, payment details
│   ├── data/
│   │   ├── services.ts              # fixed piercing menu (existing)
│   │   ├── store.ts                 # NEW: mode detection + unified API
│   │   └── adapters/
│   │       ├── local.ts             # NEW: demo adapter (localStorage + seed)
│   │       └── supabase.ts          # NEW: production adapter
│   ├── types/
│   │   ├── content.ts               # existing (Product, StudioProfile, …)
│   │   └── domain.ts                # NEW: Booking, BookingStatus, ProductRecord, DataMode
│   └── utils/
│       ├── money.ts, booking.ts     # existing
│       └── dates.ts                 # NEW: local ISO date + slot helpers
├── pages/
│   ├── index.astro                  # services via store (static)
│   ├── catalog.astro                # hosts CatalogGrid island
│   ├── booking.astro                # hosts BookingFlow island
│   └── admin.astro                  # hosts AdminPanel island
├── stores/cart.ts
└── styles/tokens.css
supabase/
└── migrations/0001_init.sql         # NEW: bookings + products schema (production mode)
```

**Structure Decision**: Single Astro project (constitution §1.1). The data layer is split into a
mode-agnostic `store.ts` facade plus two adapters selected at runtime; pages remain static and the
dynamic surfaces are three justified islands. `supabase/migrations/` replaces the constitution's
`pb_migrations/` because this feature standardizes on Supabase (documented deviation).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Supabase instead of PocketBase (stack §) | The user explicitly requires `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` and Supabase in production mode. | Keeping PocketBase would contradict the approved feature spec; the data layer isolates the provider, so swapping later stays cheap. |
| `PENDING` bookings block their slot (Principle IV) | Prevents double-booking during the manual WhatsApp/deposit window, as required by the spec. | Allowing `PENDING` to leave slots open risks two clients holding the same time; the studio can cancel/void to release the slot. |
| Two new client islands (`AdminPanel`, `CatalogGrid`) | Data now lives in `localStorage`/Supabase, so these views must read it in the browser; SSR cannot know it at build time. | Keeping them fully static would show stale/incorrect stock & published state and break the admin workflows. |

**Post-Design Re-check (after Phase 1)**: PASS — `data-model.md`, the contracts and `quickstart.md`
confirm: integer-cents math, slot exclusivity for active statuses, token-only styling, typed
boundaries, provider isolation, and no direct backend calls outside `src/lib/data/adapters/`.
