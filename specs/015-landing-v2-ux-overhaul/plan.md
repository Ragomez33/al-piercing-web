# Implementation Plan: Landing V2 UX Overhaul, Copy Alignment & Admin Loading States

**Branch**: `015-landing-v2-ux-overhaul` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-landing-v2-ux-overhaul/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

A cross-cutting UX/copy correction batch delivered in four coordinated workstreams over the
existing Astro + Svelte codebase, with **no new dependencies**:

1. **Re-shape the alternative landing (`/landing-v2`) into a Setmore-style continuous profile.**
   Replace the tab island (`LandingV2Tabs.svelte`) with a single-scroll page: a static Astro
   shell (`landing-v2.astro`) renders the anchor top-bar, booking-policy banner, About, Gallery and
   Address/Contact sections; the two-column grid places dynamic islands down the **left** column
   (`LandingV2Services` — grouped accordion; reused `TeamSection`) beside a **sticky right card**
   (`LandingV2Sidebar` — avatar, live "Abierto • Cierra a las XX:XX", address, rating/reviews and a
   prominent **"Reservar mi cita"** action). Smooth scrolling is pure CSS (`scroll-behavior: smooth`
   + section ids). Instagram/WhatsApp are removed from the card.
2. **Live synchronization.** Add a `subscribeToDataChanges` capability to the data layer so
   services and team changes appear on an open `/landing-v2` without a manual reload
   (`BroadcastChannel` + `storage` events in demo; Supabase Realtime in production; refresh-on-focus
   fallback).
3. **Global copy & config alignment.** Replace "Seña" → "Adelanto"/"Apartado" across every
   user-facing surface (landing pages, `BookingFlow`, WhatsApp builders, badges, tooltips), move the
   studio location from "CDMX / Ciudad de México" to **"El Tigre, Anzoátegui"** (`STUDIO_PROFILE`
   in `content.ts` **and** the `BUSINESS_ADDRESS` defaults in `config.ts`), and standardize the
   primary booking action to **"Reservar mi cita"**. The V1 landing already mounts `TeamSection`;
   it is verified and kept for team parity.
4. **Flicker-free admin mutations.** Stop calling `refreshX()` (which sets `xLoading = true` and
   swaps the whole list) after each delete/edit. Patch the in-memory list from the mutation's return
   value, keep the full loading placeholder for first load only, and show per-row busy/error states.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes: `$state`, `$derived`, `$effect`); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**No new dependencies** (browser `BroadcastChannel`, `storage` events and Supabase Realtime are built in).

**Storage**: Reuses the hybrid data layer (`src/lib/data/store.ts` → `dataStore`): Supabase Postgres
(production) / browser `localStorage` (demo). This feature adds **no tables and no migrations**. It
adds a read-side subscription capability only; enabling Supabase Realtime on `services` and
`team_members` is an optional deployment setting (a publication toggle, not a schema change).

**Testing**: `npx astro check` (type gate, **zero errors** — explicit user requirement), `npm run build`,
`npm run lint`, plus the manual scenarios in `quickstart.md`. The project has no unit-test runner.

**Target Platform**: Static web (`output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: 60fps interactions and no layout thrash. Anchor navigation is browser-native
smooth scrolling (no JS). Live refresh re-fetches only the affected resource and patches state in
place (no full-list DOM teardown), so an admin mutation never produces a visible flicker.

**Constraints**: No Tailwind; token-driven styling + scoped CSS (`design-system.md` binding). No raw
color literals. Components MUST NOT call Supabase directly — the subscription API lives in the data
layer. Integer cents and the 50% deposit rule are untouched (copy only). Existing pages/routes
unrelated to this batch keep their behavior. `astro check` MUST pass with zero errors and no type
discrepancies.

**Scale/Scope**: Single-studio site; a handful of services, products and team members. Scope = rewrite
of one page shell + one island into two, a small data-layer addition, a small hours helper, one reused
team island, copy/config edits in ~10 files, and the admin list-state refactor. No booking/catalog/
calendar logic changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `.specify/memory/constitution.md` (v1.0.0); `design-system.md` is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS (with budget note) | `landing-v2.astro` stays static (nav, banner, About, Gallery, Address). Three justified `client:*` directives on the page: `LandingV2Services` (`client:load`, above/at fold, owns the accordion + live refresh), `LandingV2Sidebar` (`client:load`, computes the live open/closed status), and the reused `TeamSection` (`client:visible`, below fold). No full-page client app, no duplicated runtime. |
| II. Token-Driven Styling (Zero Tailwind) | PASS | All new markup consumes existing tokens (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`, `--shadow-glow`, `--text-*`). No new tokens required; no raw hex outside `tokens.css`. |
| III. Type-Safe by Default | PASS | Reuses `PiercingService`, `TeamMember`, `GalleryItem`, `ProcessStep`, `StudioProfile`. New static review/rating types and the `DataChangeEvent` union are explicit; `subscribeToDataChanges` is typed; no `any`; `astro check` zero errors. |
| IV. Booking & Financial Integrity | PASS | Pure presentational/copy change. Money stays integer cents; the 50% deposit and slot-exclusivity rules are untouched. `/landing-v2` and booking only *read and display*, linking to the existing flow. |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | CSS-only smooth scroll that honors `prefers-reduced-motion`, single-column collapse, ≥44px targets, semantic landmarks/headings, `aria-live` for async states, visible focus. Live updates patch in place with no layout thrash. |
| Data Access (Workflow) | PASS | The new subscription lives in `src/lib/data/store.ts`; pages/islands consume it via the facade — no direct Supabase access from `.svelte`/`.astro`. |
| Schema Control (Workflow) | PASS | No collection/table change. Supabase Realtime is an optional deployment publication, not a migration. |
| Design Parity (Workflow) | PASS | `design-system.md` and `README.md` are updated to describe the continuous landing, the sticky card and the subscription capability. |

**Gate result**: PASS with no unjustified violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| I. Islands | PASS | Contracts fix exactly three directives on `/landing-v2` and confirm the shell/banner/About/Gallery/Address remain server-rendered. |
| II. Token-Driven | PASS | `landing-v2-ui-contract` and `admin-list-state-contract` forbid raw values and reuse card/badge/skeleton tokens. |
| III. Type-Safe | PASS | Contracts pin the `subscribeToDataChanges` signature and the review/rating types; `astro check` is the gate. |
| IV / Data Access / Schema Control | PASS | Read-only presentation; subscription delegated to the data layer; no schema surface. |
| V | PASS | Contracts require no horizontal scroll, ≥44px controls, reduced-motion handling, and in-place (non-thrashing) list updates. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/015-landing-v2-ux-overhaul/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── landing-v2-ui-contract.md
│   ├── data-sync-contract.md
│   ├── admin-list-state-contract.md
│   └── copy-config-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── landing/
│   │   ├── LandingV2Tabs.svelte       # DELETE — replaced by the continuous layout below
│   │   ├── LandingV2Services.svelte   # NEW: grouped accordion + live refresh (client:load)
│   │   └── LandingV2Sidebar.svelte    # NEW: sticky card, live open status, CTA (client:load)
│   ├── team/
│   │   └── TeamSection.svelte         # MODIFY: subscribe to team changes (reused on both landings)
│   ├── booking/
│   │   └── BookingFlow.svelte         # MODIFY: "Seña"→"Adelanto", "turno"→"cita" copy
│   └── admin/
│       ├── AdminPanel.svelte          # MODIFY: non-flicker list state; "Requiere seña" copy
│       └── AdminCalendar.svelte       # MODIFY: "Seña (50%)"→"Adelanto (50%)" copy
├── pages/
│   ├── landing-v2.astro               # MODIFY: continuous two-column shell + anchor nav + islands
│   ├── index.astro                    # MODIFY: copy/location; keep TeamSection mount
│   └── booking.astro                  # MODIFY: copy (adelanto / cita)
├── layouts/
│   └── BaseLayout.astro               # (reference only — smooth-scroll base rule if not page-local)
└── lib/
    ├── types/
    │   └── content.ts                 # MODIFY: STUDIO_PROFILE.location, PROCESS_STEPS copy,
    │                                  #   NEW STUDIO_RATING + STUDIO_REVIEWS + BOOKING_POLICY
    ├── config.ts                      # MODIFY: BUSINESS_ADDRESS defaults (El Tigre, Anzoátegui)
    ├── data/
    │   ├── realtime.ts                # NEW: DataChangeEvent + subscribeToDataChanges + transports
    │   ├── store.ts                   # MODIFY: mutation notifier (publishes service/team/product changes)
    │   └── services.ts                # (reference only — unchanged types)
    └── utils/
        ├── booking.ts                 # MODIFY: WhatsApp copy ("turno"→"cita")
        └── hours.ts                   # NEW: open/closed + next-closing-time helper
design-system.md                       # MODIFY: document continuous landing + sticky card + live sync
README.md                              # MODIFY: update /landing-v2 description
```

**Structure Decision**: Single-project Astro/Svelte layout, unchanged from features 013/014. The page
shell and all static content stay in `landing-v2.astro`; interactivity is confined to two small
column-scoped islands (services, sidebar) plus the reused team island, avoiding a single monolithic
island that would embed static content in JS. Live synchronization is added once in the data layer
(`store.ts`) and consumed by both islands and `TeamSection`, keeping data access out of components.

## Complexity Tracking

> Deviations from the constitution that are justified here.

**None** — the design introduces no constitution violations. Deliberate, documented trade-offs:

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| **Three** `client:*` directives on `/landing-v2` (services, sidebar, team) instead of one island. | The two columns are disjoint DOM regions; the sidebar's open/closed status is client-only, and the service accordion is independent. Splitting keeps static content server-rendered and each island minimal. | One monolithic island rendering the whole page: embeds static About/Gallery/Address markup in JS and inflates the island payload. |
| Admin lists are patched from each mutation's returned record instead of re-fetching (`refreshX()`). | The re-fetch toggled `xLoading`, swapping the entire list for a placeholder — the source of the flicker. Local patching removes a round-trip and keeps rows mounted. | Keep the re-fetch but add a skeleton: still swaps the DOM and costs an extra request, so it remains visually unstable. |
| Live sync uses `BroadcastChannel` + `storage` events (demo) and Supabase Realtime (production) rather than polling. | Zero-cost, event-driven, and works both with the local demo adapter and the Supabase adapter without a backend change. | Interval polling: constant background traffic and delayed updates with no benefit here. |
