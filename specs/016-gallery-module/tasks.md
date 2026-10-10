---
description: "Task list for Galería / Nuestro Trabajo — Managed Gallery Module"
---

# Tasks: Galería / Nuestro Trabajo — Managed Gallery Module

**Input**: Design documents from `specs/016-gallery-module/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT included. The project has no unit-test runner and the specification did not request a TDD approach. Verification is `npx astro check`, `npm run build`, `npm run lint` and the manual scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes an exact file path

## Path Conventions

Single project: `src/` at repository root (Astro pages + Svelte islands), plus `supabase/migrations/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline; no dependencies are added.

- [X] T001 Confirm branch `016-gallery-module` is checked out with no new dependencies needed, and capture the pre-change baseline by running `npm run check` and `npm run build` at the repository root.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The gallery data layer (entity, migration, client types, adapters, realtime resource) that ALL user stories consume.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `supabase/migrations/0007_gallery.sql` with table `public.gallery_items` (columns `id uuid primary key default gen_random_uuid()`, `title text not null default ''`, `category text not null default ''`, `image_url text not null`, `is_active boolean not null default true`, `created_at timestamptz not null default now()`), `enable row level security`, policy `gallery_items select public` `for select using (is_active = true)`, policies `select/insert/update/delete` for `authenticated` (with `using(true)` / `with check(true)`), and `grant all on public.gallery_items to anon, authenticated, service_role;` (mirror `0006_team_members.sql`).
- [X] T003 [P] Add to `src/lib/types/domain.ts`: `GalleryItemRecord { id: string; title: string; category: string; imageUrl: string; isActive: boolean; createdAt: string }` and `NewGalleryItemInput { title?: string; category?: string; imageUrl: string }` where `imageUrl` is required and validated non-empty (`DataError("La imagen es obligatoria")`); extend the `DataStore` interface with `listGalleryItems(input?: { includeInactive?: boolean }): Promise<GalleryItemRecord[]>`, `createGalleryItem(input: NewGalleryItemInput): Promise<GalleryItemRecord>`, `toggleGalleryItemActive(id: string): Promise<GalleryItemRecord>` (unknown id → `DataError("Imagen no encontrada")`), and `deleteGalleryItem(id: string): Promise<void>`.
- [X] T004 [P] Extend `src/types/supabase.ts`: add `gallery_items` under `Tables` with `Row`/`Insert`/`Update` (snake_case keys: `id`, `title`, `category`, `image_url`, `is_active`, `created_at`) and `Relationships: []`, styled exactly like `team_members`.
- [X] T005 [P] Create `src/lib/data/gallery.ts` exporting `GALLERY_SEED: GalleryItemRecord[]` reusing `public/images/featured-1.svg`…`featured-4.svg`, each `isActive: true`, with categories `HELIX`, `NOSTRIL`, `NAVEL`, `TITANIO`.
- [X] T006 Implement gallery CRUD in `src/lib/data/adapters/local.ts`: key `alpi:gallery:v1`, guard function `isGalleryItem`, seed from `GALLERY_SEED`, public list returns active only, create forces `isActive: true` and generated `id`/`createdAt`, toggle flips `isActive` and errors `"Imagen no encontrada"` for unknown ids, delete filters by id.
- [X] T007 [P] Implement gallery methods in `src/lib/data/adapters/supabase.ts`: `toGalleryItem(row)` mapping `image_url → imageUrl`, `is_active → isActive`, `created_at → createdAt`; `listGalleryItems` filters `eq("is_active", true)` unless `includeInactive`; `createGalleryItem` inserts `{ title, category, image_url }` with default `is_active: true`; `toggleGalleryItemActive` flips `is_active`; `deleteGalleryItem` deletes by id (typed via the new `gallery_items` keys).
- [X] T008 [P] Extend `src/lib/data/realtime.ts`: add `"gallery"` to `DataResource` and add a Supabase `postgres_changes` listener on table `gallery_items`.
- [X] T009 Update `src/lib/data/store.ts`: export `listFallbackGalleryItems(): Promise<GalleryItemRecord[]>` (via `createLocalAdapter().listGalleryItems()`); in `withChangeNotifications` add gallery publish wrappers for `createGalleryItem` / `toggleGalleryItemActive` / `deleteGalleryItem` that call `publishDataChange("gallery")` only after success.

**Checkpoint**: Foundation ready — the gallery can be listed/created/toggled/deleted in both modes and publishes change events.

---

## Phase 3: User Story 1 - Manage the studio's work photos from the admin (Priority: P1) 🎯 MVP

**Goal**: A Galería tab in the admin with a responsive card grid, live-preview upload (title + category), activate/deactivate switch and confirmed delete — all flicker-free.

**Independent Test**: Open `/admin?tab=gallery`; upload a photo (live preview) → the card appears in place; toggle it off/on instantly; delete via confirmation; force a failure → previous data retained with an inline error; the grid never blanks.

### Implementation for User Story 1

- [X] T010 [US1] In `src/components/admin/AdminPanel.svelte`: add `"gallery"` to `AdminTab`; add a Galería sidebar button (lucide `Image` icon, `side-link` styling) between Servicios and Equipo; wire `switchTab("gallery")` and the `onMount` URL parse to `?tab=gallery` with `refreshGallery()`.
- [X] T011 [US1] In `src/components/admin/AdminPanel.svelte`: add `gallery` list state (`galleryItems`, `galleryLoading`, `galleryLoaded`, `galleryError`, `gBusy`) and render the responsive card grid (1→2→3 columns): square `loading="lazy"` thumbnail with `data-fallback`, title (or "Sin título"), category chip, "Oculta" chip when `!isActive`, state switch and Eliminar button; empty state `"No hay fotos en la galería."`; placeholder only when `!galleryLoaded`.
- [X] T012 [US1] In `src/components/admin/AdminPanel.svelte`: add the "Nueva foto" modal — image file input (image-only validation), live preview via `URL.createObjectURL` (revoked on close/replace), optional title, category input with a `<datalist>` of `NOSTRIL, HELIX, NAVEL, TITANIO, Otro`; on submit call `uploadImage(file, { prefix: "gallery-" })` then `dataStore.createGalleryItem({ title, category, imageUrl })` and append the returned record in place (busy "Subiendo imagen…" while uploading).
- [X] T013 [US1] In `src/components/admin/AdminPanel.svelte`: implement the toggle (`dataStore.toggleGalleryItemActive` → replace item by id) and the delete confirmation dialog (`dataStore.deleteGalleryItem` → filter after resolve); per-card `gBusy` sets `class:busy`/`aria-busy` and disables controls until `finally`; failures keep `galleryItems` and show inline `galleryError` (`role="alert"`); never call a full re-fetch after a mutation.

**Checkpoint**: Admin Galería tab is fully functional and flicker-free.

---

## Phase 4: User Story 2 - Show the studio's work to visitors on both lands (Priority: P1)

**Goal**: Both landing pages render the managed gallery in a responsive mosaic with an accessible lightbox, replacing the previous static tiles.

**Independent Test**: On `/landing-v2#galeria` and on `/` ("Nuestro trabajo"), only active photos appear in a no-horizontal-scroll mosaic (320–1920px); clicking a tile opens the lightbox; ArrowRight/ArrowLeft navigate, Esc closes and focus returns to the opener; empty gallery shows a graceful empty state.

### Implementation for User Story 2

- [X] T014 [US2] Create `src/components/landing/LandingGallery.svelte` (`client:load`): load `dataStore.listGalleryItems()` (active only) with `listFallbackGalleryItems()` fallback and a non-blocking notice on read failure; render a responsive CSS-columns mosaic (1→2→3→4 by breakpoint) of `aspect-ratio` tiles with `loading="lazy"` images, `data-fallback="/images/placeholder.svg"` and a category/title chip (`overflow-wrap: anywhere`); empty state `"No hay fotos por el momento."`; tokens only (per `contracts/public-gallery-ui-contract.md` §1–2).
- [X] T015 [US2] Add the lightbox to `src/components/landing/LandingGallery.svelte`: full-screen overlay (`--overlay-backdrop`, `--z-modal`), enlarged image with title/category, close button ≥44×44px, `role="dialog"` + `aria-modal`, `Escape` closes, `ArrowLeft`/`ArrowRight` navigate with wrap, focus moves into the dialog on open (`$effect`) and restores to the originating tile on close; open/close transitions and shimmer suppressed under `prefers-reduced-motion`; close gracefully if the open item disappears mid-view.
- [X] T016 [US2] Mount `<LandingGallery client:load />` in `src/pages/landing-v2.astro` inside the `#galeria` section, replacing the static `GALLERY_ITEMS` tiles (keep the section heading and `scroll-margin-top`).
- [X] T017 [P] [US2] Mount `<LandingGallery client:load />` in `src/pages/index.astro` in the teaser section, replacing its static gallery, with the section heading "Nuestro trabajo".
- [X] T018 [P] [US2] Remove the static `GalleryItem` interface and `GALLERY_ITEMS` constant from `src/lib/types/content.ts` and drop any remaining references (the demo seed in `src/lib/data/gallery.ts` is the replacement).

**Checkpoint**: Both lands show the managed gallery with an accessible lightbox.

---

## Phase 5: User Story 3 - See gallery changes live without reloading (Priority: P2)

**Goal**: Open gallery sections refresh when the operator uploads, deactivates or deletes photos — no manual reload.

**Independent Test**: With `/` (or `/landing-v2`) open showing the gallery, upload an active photo in the admin → it appears within ~5s without reload; deactivate/delete it → it disappears; with the transport unavailable the last-known content remains.

### Implementation for User Story 3

- [X] T019 [US3] In `src/components/landing/LandingGallery.svelte`: subscribe with `subscribeToDataChanges(["gallery"], …)` on mount, debounce (~150 ms), skip an in-flight re-fetch, re-fetch via `listGalleryItems()` and patch in place (no teardown/scroll jump); unsubscribe on destroy; never throw (depends on T014, T008, T009).

**Checkpoint**: Gallery live-syncs across admin and public pages.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and end-to-end validation.

- [X] T020 [P] Update `design-system.md` to document the gallery module (mosaic + lightbox + realtime + admin tab).
- [X] T021 [P] Update `README.md` (route/module table, `Galería` tab, structure entries for `data/gallery.ts` and `landing/LandingGallery.svelte`).
- [X] T022 Run `npx astro check` (MUST pass 0 errors / no type discrepancies), `npm run build` and `npm run lint`; fix any issues introduced.
- [X] T023 Automated validation passed: `astro check` (0 errors) + `npm run build` + `npm run lint`, rendered-HTML checks (island SSR'd on both landings, admin + store bundles include gallery code, no `GALLERY_ITEMS` references). Interactive browser scenarios (admin upload/toggle/delete flicker, cross-tab live sync, lightbox keyboard pass) remain for the manual pass in `quickstart.md` — see completion notes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phases 3–5)**: All depend on Foundational. US1 (admin) and US2 (public) are independent of each other. US3 depends on US2's `LandingGallery` + Foundational realtime.
- **Polish (Phase 6)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: After Foundational (T010–T013 all in `AdminPanel.svelte`). Independent of US2.
- **US2 (P1)**: After Foundational (T014–T015 build the island; T016/T017/T018 mount/cleanup). Independent of US1.
- **US3 (P2)**: After Foundational **and US2's T014** (subscribes inside `LandingGallery.svelte`); realtime infra comes from T008/T009.

### Within Each User Story

- Foundational: types/entity → migration/types → adapters → store/realtime.
- US1: tab + state → grid → upload → toggle/delete → validation.
- US2: island data/mosaic → lightbox → mounts → static cleanup.
- US3: subscription last (after the island exists).

### Parallel Opportunities

- Foundational: T002, T003, T004, T005, T007, T008 are all different files → parallel; T006 (local adapter) depends on T003+T005; T009 (store) depends on T003+T008 (and the adapter surface).
- US2: T016 (landing-v2), T017 (index) and T018 (content.ts) are separate files → parallel after T014.
- Polish: T020 and T021 are different files → parallel.
- US1: all tasks edit `AdminPanel.svelte` → sequential (no `[P]`).

---

## Parallel Example: User Story 2

```bash
# Mount the island on both lands and drop the static constant (different files):
Task: "Mount LandingGallery in landing-v2.astro #galeria (T016)"
Task: "Mount LandingGallery in index.astro (T017)"
Task: "Remove static GalleryItem/GALLERY_ITEMS from content.ts (T018)"
```

## Parallel Example: Foundational

```bash
# Independent data-layer pieces:
Task: "Create supabase/migrations/0007_gallery.sql (T002)"
Task: "Add GalleryItemRecord + DataStore ops to domain.ts (T003)"
Task: "Add gallery_items types to src/types/supabase.ts (T004)"
Task: "Create src/lib/data/gallery.ts seed (T005)"
Task: "Implement gallery methods in adapters/supabase.ts (T007)"
Task: "Add 'gallery' resource to realtime.ts (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 3 (US1) — admin Galería tab.
3. **STOP and VALIDATE**: `quickstart.md` scenario 2; confirm flicker-free CRUD.
4. Demo the managed gallery (admin side) as the MVP.

### Incremental Delivery

1. Setup + Foundational → data layer ready.
2. US1 → validate → admin management (MVP).
3. US2 → validate → public mosaic + lightbox on both lands.
4. US3 → validate → live gallery updates.
5. Polish (T020–T023) → docs + full `quickstart.md`.

### Parallel Team Strategy

After Foundational:
- Developer A: US1 (admin Galería tab).
- Developer B: US2 (public island + mounts) and US3 (subscription).
- Polish tasks T020/T021 can run at any time (docs).

---

## Notes

- `[P]` = different files, no dependencies.
- No test tasks: no test runner and no TDD request; gates are `astro check`/build/lint + `quickstart.md`.
- Commit after each task or logical group; stop at checkpoints.
- Same-file rules: `AdminPanel.svelte` (US1) and `LandingGallery.svelte` (US2+US3) are edited sequentially by their owners; `content.ts` is touched once (T018); `store.ts` once (T009); `realtime.ts` once (T008).