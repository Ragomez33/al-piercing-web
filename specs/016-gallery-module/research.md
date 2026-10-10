# Phase 0 Research: Galería / Nuestro Trabajo — Managed Gallery Module

**Feature**: `016-gallery-module` | **Date**: 2026-10-10

All unknowns from the Technical Context are resolved below as **Decision / Rationale / Alternatives**,
grounded in the current repository (patterns from features 011, 012 and 015).

---

## R1 — Entity placement and naming

**Decision**: Define the managed entity as `GalleryItemRecord` in `src/lib/types/domain.ts` with exactly
`id: string`, `title: string`, `category: string`, `imageUrl: string`, `isActive: boolean`,
`createdAt: string`, plus the creation input `NewGalleryItemInput { title?: string; category?: string; imageUrl: string }`.

**Rationale**: `domain.ts` holds every persisted entity the hybrid store exposes (`ProductRecord`,
`TeamMember`, `Booking`); `GalleryItemRecord` continues that convention. The `db`-style names
(`image_url`, `is_active`, `created_at`) appear only in the migration and the supabase mapping, mirrored
north-bound to camelCase by the adapters exactly like `team_members` → `TeamMember`.

**Alternatives considered**: Reusing the static `GalleryItem` interface already exported from
`src/lib/types/content.ts` (rejected: it models the old static seed with `image`/`alt`/`label`, not the
managed entity, and would conflate two meanings); naming it `GalleryItem` in domain.ts (rejected: a name
clash with the existing `content.ts` export).

---

## R2 — Static gallery content is superseded by the seed

**Decision**: The static `GALLERY_ITEMS` constant and its usages in `landing-v2.astro` and `index.astro`
are removed. A new demo seed `src/lib/data/gallery.ts` (`GALLERY_SEED: GalleryItemRecord[]`) reuses the
existing `public/images/featured-*.svg` assets with `isActive: true` and the classic labels
(`HELIX`, `NOSTRIL`, `NAVEL`, `TITANIO`) as `category`. The static `GalleryItem` interface in
`content.ts` is deleted together with its constant (only the two landings referenced it).

**Rationale**: Keeps the demo experience visually identical while making the landings fully data-driven
(FR-010/FR-011). The seed lives in the data layer, so components never import a hardcoded list
(constitution "Data Access").

**Alternatives considered**: Keeping `GALLERY_ITEMS` as an unused constant (rejected: dead code and a
second source of truth); building the seed in `content.ts` (rejected: it belongs with the data layer like
`services.ts`/`team.ts`).

---

## R3 — DataStore operations

**Decision**: Add to `DataStore`:
- `listGalleryItems(input?: { includeInactive?: boolean }): Promise<GalleryItemRecord[]>`
  (public = active only, mirroring `listServices`/`listTeamMembers`);
- `createGalleryItem(input: NewGalleryItemInput): Promise<GalleryItemRecord>`;
- `toggleGalleryItemActive(id: string): Promise<GalleryItemRecord>` (returns the toggled record so the
  admin patches in place);
- `deleteGalleryItem(id: string): Promise<void>`.

Also export `listFallbackGalleryItems(): Promise<GalleryItemRecord[]>` from `store.ts`, mirroring
`listFallbackServices`/`listFallbackTeamMembers`.

**Rationale**: The four operations match the spec exactly; the `toggle` returns the record so the admin
list can be updated from the mutation result without a re-fetch (feature-015 flicker-free pattern).

**Alternatives considered**: A generic `updateGalleryItem(id, patch)` (rejected: the admin never edits
title/category, and the spec explicitly lists the toggle operation).

---

## R4 — Migration `0007_gallery.sql`

**Decision**: Mirror `0006_team_members.sql` exactly in shape and policy:

```sql
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  category text not null default '',
  image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

with `enable row level security`, policies `gallery_items select public` (for select using
`is_active = true`), and `select/insert/update/delete authenticated`, plus the explicit
`grant all` line for parity with 0006.

**Rationale**: Reuses the proven RLS split (public read of active rows only; authenticated full
management) so the public and admin query paths are enforced at the database. Default privileges from
0004 already cover GRANTs; the explicit line documents intent like 0006 does.

**Alternatives considered**: One `uid` column naming scheme (rejected: 0006 uses `id`, stay consistent);
no RLS on `image_url` (not applicable; the whole table is RLS-guarded).

---

## R5 — Hand-maintained Supabase types

**Decision**: Extend the `Database` type in `src/types/supabase.ts` with a
`gallery_items: { Row / Insert / Update / Relationships: [] }` block matching the migration — same style
as `team_members` (snake_case keys).

**Rationale**: The file is hand-maintained in this repo (there is no generator run wired into the
workflow), and feature 012 documented that the generated client types are updated as part of the
migration workflow. Skipping it would break the typed `getSupabaseClient()` adapter.

**Alternatives considered**: Running a Supabase type generator (rejected: not part of the repo toolchain;
hand editing one table is smaller and matches prior features).

---

## R6 — Realtime extension

**Decision**: Extend `DataResource` in `src/lib/data/realtime.ts` with `"gallery"`; add the Supabase
`postgres_changes` channel for `gallery_items`; and in `store.ts`'s `withChangeNotifications` wrapper,
publish `"gallery"` after successful `createGalleryItem`, `toggleGalleryItemActive` and
`deleteGalleryItem`.

**Rationale**: `LandingGallery` needs the same "see it without a reload" behavior the services/team got
in 015, and the infrastructure already exists — adding a resource is a small, typed change.
Demo transport (BroadcastChannel/storage) and the focus fallback work unchanged.

**Alternatives considered**: A separate polling interval for the gallery (rejected: duplicates effort,
adds traffic); skipping realtime for the gallery (rejected: FR-014 requires it).

---

## R7 — Admin tab UX

**Decision**: Add `"gallery"` to the `AdminTab` union, a **Galería** sidebar entry (lucide `Image` icon)
between **Servicios** and **Equipo**, and `?tab=gallery` URL support in `switchTab`/`onMount` parsing.
The tab renders:
- a responsive card grid (thumb, title, category chip, active/inactive switch, delete button);
- an upload modal with a live preview (`URL.createObjectURL`), optional title input, a category input
  with a `<datalist>` of the four piercing categories + "Otro";
- a delete confirmation dialog;
- flicker-free list state exactly as feature 015: `galleryLoaded` guard for the first-load placeholder,
  in-place patching from mutation returns, per-row `gBusy` with `class:busy` + `aria-busy`, and inline
  `galleryError` preserved on failure.

**Rationale**: Reuse of the 015 pattern guarantees the same no-flicker guarantees without reinvention,
and keeping the upload inside the existing admin island avoids a second island.

**Alternatives considered**: Editing/renaming items in the admin (rejected: not requested; title/category
are set at upload time).

---

## R8 — Public gallery island and lightbox

**Decision**: One new island `src/components/landing/LandingGallery.svelte` (`client:load`) that:
- loads `dataStore.listGalleryItems()` with the `listFallbackGalleryItems()` fallback and a
  non-blocking notice on read failure;
- renders a responsive mosaic using CSS columns (1 → 2 → 3 → 4 at breakpoints) with `aspect-ratio`
  tiles, `loading="lazy"` images and `data-fallback` placeholders;
- opens a lightbox on tile click: full-screen overlay on `--overlay-backdrop`, enlarged image with
  title/category, `Esc` to close, `ArrowLeft`/`ArrowRight` to navigate, close button ≥44px, focus moved
  into the dialog and restored to the opened tile on close, `aria-modal` + labelled region;
- subscribes via `subscribeToDataChanges(["gallery"], …)`, debounced, re-fetching and patching in place;
- disables transitions/skeleton shimmer under `prefers-reduced-motion`.

Mounted in `landing-v2.astro` (`#galeria`) and `index.astro` (teaser section, heading "Nuestro trabajo").

**Rationale**: A single island guarantees identical, accessible behavior on both pages (FR-010…FR-012)
and keeps the lightbox purely client-side with no dependency.

**Alternatives considered**: Third-party lightbox library (rejected: no new dependencies policy);
separate lightbox island (rejected: extra hydration/coordination, see plan Complexity Tracking).

---

## R9 — Storage uploads

**Decision**: The admin uploads via the existing `uploadImage(file, { prefix: "gallery-" })` from
`src/lib/services/storage.ts` (production: `products` bucket with the `gallery-` prefix; demo: inlined
data URL). The returned URL is stored as `image_url`.

**Rationale**: 011/012 already route all uploads through this single service (constitution "Data
Access"); the `prefix` option exists precisely for this kind of grouping, and demo mode already persists
data URLs in `localStorage`.

**Alternatives considered**: A new dedicated bucket (rejected: the shared bucket + prefix is the
established pattern and needs no storage policy changes).

---

## R10 — Dependency/assumption notes

**Decision**: No new dependencies; no changes to booking, money or existing routes; public copy in
Spanish; gallery migrations numbered 0007; lightbox is keyboard- and reduced-motion-friendly.

**Rationale**: All requested behavior is expressible with the existing stack, tokens and patterns.