# Implementation Plan: Galería / Nuestro Trabajo — Managed Gallery Module

**Branch**: `016-gallery-module` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-gallery-module/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add the **managed gallery module** end-to-end, following the exact patterns already established by the
services (011) and team (012) modules:

1. **Data layer**: a `GalleryItemRecord` entity (`id`, `title`, `category`, `image_url`, `is_active`,
   `created_at`) in `src/lib/types/domain.ts`, four `DataStore` operations
   (`listGalleryItems`, `createGalleryItem`, `toggleGalleryItemActive`, `deleteGalleryItem`), the
   migration `supabase/migrations/0007_gallery.sql` (`public.gallery_items` + RLS, mirroring 0006),
   the matching hand-maintained `gallery_items` types in `src/types/supabase.ts`, a demo seed
   (`src/lib/data/gallery.ts` + the local adapter `alpi:gallery:v1`), and a `listFallbackGalleryItems`
   fallback exported from `store.ts`.
2. **Admin (feature 015 patterns)**: a **Galería** tab (`?tab=gallery`) alongside Calendario /
   Inventario / Servicios / Equipo with a responsive card grid, live-preview upload
   (`uploadImage(file, { prefix: "gallery-" })`, optional title + category with a suggested datalist),
   an activate/deactivate switch and a confirmed-delete dialog — all **flicker-free** (first-load
   placeholder only; mutations patch the array in place, per-row busy states, inline errors).
3. **Public landings**: one new island `src/components/landing/LandingGallery.svelte`
   (`client:load`) renders the managed gallery as a responsive **mosaic/masonry** grid with an
   **accessible lightbox** (Esc, arrow navigation, focus restore, reduced-motion). It is mounted in both
   `landing-v2.astro` (`#galeria`) and `index.astro` ("Nuestro trabajo"), replacing the previous static
   `GALLERY_ITEMS` tiles. The island subscribes to live gallery changes via `subscribeToDataChanges`
   (extended with a new `"gallery"` resource) so uploads/toggles/deletes appear without a reload.

No monetary/booking logic changes. No new dependencies.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes: `$state`, `$derived`, `$effect`); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**No new dependencies** (the lightbox is a small client-side island feature).

**Storage**: Reuses the hybrid data layer (`src/lib/data/store.ts` → `dataStore`): Supabase Postgres
(production) / browser `localStorage` (demo). Adds **one new table** (`gallery_items`) via a migration
and a **new demo storage key** (`alpi:gallery:v1`) — no changes to existing tables.

**Testing**: `npx astro check` (type gate, **zero errors** — explicit user requirement), `npm run build`,
`npm run lint`, plus the manual scenarios in `quickstart.md`. The project has no unit-test runner.

**Target Platform**: Static web (`output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: 60fps; the gallery island hydrates with its section (above fold on `/landing-v2`,
below fold on `/`); images use `loading="lazy"` + width/height (or aspect-ratio) to avoid layout shift;
the lightbox only mounts extra DOM while open; realtime refetches only the gallery resource and patches
in place (no teardown).

**Constraints**: No Tailwind; token-driven styling + scoped CSS (`design-system.md` is binding). Data
access only via `dataStore` (and image transport only via `src/lib/services/storage.ts`); migrations
follow the numbered 0001–0006 style; the hand-maintained `src/types/supabase.ts` must gain the
`gallery_items` table keys; `astro check` zero errors; unrelated routes/behavior untouched.

**Scale/Scope**: Single-studio site; a handful of gallery photos. Scope = one migration, two type edits
(domain + supabase.ts), two adapter edits (local seed + supabase mapping), one store wrapper extension,
realtime extension (resource + publish + channel), one admin tab, one new landing island, two page
mounts, docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `.specify/memory/constitution.md` (v1.0.0); `design-system.md` is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS | Shells stay static; one **new** island (`LandingGallery`, `client:load`) owns gallery data + lightbox. Admin remains a single existing island. No full-page app, no new runtimes. |
| II. Token-Driven Styling (Zero Tailwind) | PASS | New UI consumes existing tokens (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`, `--shadow-glow`, `--overlay-backdrop`, `--z-modal`); no raw hex in components. |
| III. Type-Safe by Default | PASS | `GalleryItemRecord` is a shared explicit type with validated inputs; `supabase.ts` `gallery_items` Row/Insert/Update mirror the migration; no `any`; `astro check` is the gate. |
| IV. Booking & Financial Integrity | PASS | No money/slot logic touched. The gallery is presentation + media only. |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | 320–1920px no horizontal scroll, ≥44px targets, keyboard-operable lightbox (Esc/arrows/focus restore), `loading="lazy"`, respect `prefers-reduced-motion`, flicker-free admin via `*Loaded` guards. |
| Data Access (Workflow) | PASS | Islands call only `dataStore.listGalleryItems()` / `subscribeToDataChanges`; uploads only via `uploadImage`; no direct Supabase access from `.svelte`/`.astro`. |
| Schema Control (Workflow) | PASS | New table expressed as migration `0007_gallery.sql` and mirrored in `src/types/supabase.ts` before UI integration; demo parity via local-adapter seed. |
| Design Parity (Workflow) | PASS | `design-system.md` and `README.md` are updated to document the gallery module. |

**Gate result**: PASS with no unjustified violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| I. Islands | PASS | Contract fixes exactly one new public island plus the existing admin island; lightbox is internal to `LandingGallery`. |
| II / V | PASS | Contracts forbid raw values and require in-place updates, ≥44px targets, lazy images and reduced-motion handling. |
| III / Schema | PASS | Contracts pin the entity + migration shape and the `gallery_items` type keys; `astro check` is the gate. |
| Data Access / IV | PASS | Data + uploads stay behind the facade; no financial surface. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/016-gallery-module/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── gallery-data-contract.md
│   ├── admin-gallery-ui-contract.md
│   └── public-gallery-ui-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
supabase/migrations/0007_gallery.sql          # NEW: gallery_items table + RLS (mirrors 0006)

src/
├── types/
│   ├── supabase.ts                            # MODIFY: add `gallery_items` Row/Insert/Update
│   └── domain.ts                              # MODIFY: GalleryItemRecord, NewGalleryItemInput,
│                                              #          DataStore methods
├── lib/
│   ├── data/
│   │   ├── gallery.ts                         # NEW: GALLERY_SEED (demo seed)
│   │   ├── adapters/local.ts                  # MODIFY: alpi:gallery:v1 CRUD + guard
│   │   ├── adapters/supabase.ts               # MODIFY: gallery mapping (toGalleryItem)
│   │   ├── realtime.ts                        # MODIFY: DataResource += "gallery" + channel
│   │   └── store.ts                           # MODIFY: publish + listFallbackGalleryItems + wrapper
│   └── types/content.ts                       # MODIFY: remove static GALLERY_ITEMS usage (keep lib intact)
├── components/
│   ├── admin/AdminPanel.svelte                # MODIFY: Galería tab (grid, upload, toggle, delete)
│   └── landing/LandingGallery.svelte          # NEW: mosaic + lightbox + realtime (client:load)
└── pages/
    ├── landing-v2.astro                       # MODIFY: #galeria mounts LandingGallery
    └── index.astro                            # MODIFY: "Nuestro trabajo" mounts LandingGallery
design-system.md                               # MODIFY: document the gallery module + lightbox
README.md                                      # MODIFY: route/tab/structure updates
```

**Structure Decision**: Single-project Astro/Svelte layout, consistent with 011/012/015. The entity
reuses the `domain.ts` + dual-adapter pattern; the admin tab reuses the 015 flicker-free list-state
pattern; the public gallery is a single self-contained island (data, mosaic, lightbox, live refresh)
mounted on both landings to avoid duplicating gallery logic.

## Complexity Tracking

> Deviations from the constitution that are justified here.

**None** — no constitution violations. Deliberate trade-offs:

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| One shared `LandingGallery` island mounted on **both** landings. | Identical gallery behavior (mosaic + lightbox + realtime) on two pages; one component avoids drift. | Two bespoke implementations (rejected: duplicates lightbox/a11y/realtime logic). |
| Lightbox lives inside the island instead of a separate overlay island. | The lightbox only exists relative to the gallery list state; a separate island would add a second hydration and cross-component coordination. | A dedicated `client:visible` lightbox island + events (rejected: extra runtime and coordination). |
| `toggleGalleryItemActive(id)` instead of a generic patch update. | The admin only ever toggles visibility (no edit/rename per spec); matches the requested operation while keeping the list-state pattern. | Generic `updateGalleryItem` (rejected: unused surface; the spec explicitly lists the toggle op). |