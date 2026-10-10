# Quickstart Validation: Galería / Nuestro Trabajo — Managed Gallery Module

**Feature**: `016-gallery-module` | **Date**: 2026-10-10

Runnable validation for the end-to-end behavior. References the contracts/data model instead of
duplicating them. Implementation details live in `tasks.md` and the implementation phase.

## Prerequisites

- Node `>=22.12.0`, dependencies installed (`npm install`).
- Demo mode (default) needs no backend: `localStorage` seeds `alpi:gallery:v1`.
- Production mode: set `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, apply the migration
  `supabase/migrations/0007_gallery.sql`, and confirm Realtime is enabled on `gallery_items` for live
  cross-device updates.

## Setup & commands

```bash
npm install
npm run dev        # local site (default http://localhost:4321)
npm run check      # npx astro check — MUST pass with 0 errors
npm run build      # static build MUST succeed
npm run lint
```

## Automated gate

- `npx astro check` → **0 errors, 0 warnings-as-errors, no type discrepancies**.
- `npm run build` → succeeds; `/`, `/landing-v2` and `/admin` are emitted.

## Scenario 1 — Managed entity + demo seed (FR-001…FR-003)

1. In demo mode, open `/landing-v2` and `/`.
2. Confirm both "Galería / Nuestro trabajo" sections show the seeded photos (the four featured images).
3. In the browser console/network expectations, confirm the sections came from the data layer (not
   hardcoded page markup).

Expected: gallery renders from the managed list; no hardcoded items remain in the pages.

## Scenario 2 — Admin Galería tab (FR-005…FR-009)

1. Open `/admin?tab=gallery` (production mode with an authenticated session).
2. Confirm the responsive card grid shows all items with title/category/state.
3. "Nueva foto" → pick an image → verify the **live preview**; optionally set title and category
   (suggestions via datalist); save → the card appears in place **without any flicker/blanking**.
4. Toggle a card off/on → state flips immediately; the thrown row stays mounted.
5. Delete a card: cancel → nothing happens; confirm → card is removed only after the operation resolves.
6. Force a failure (e.g., offline): previous data remains and an inline error appears.

Expected: upload/toggle/delete are flicker-free; failures preserve data.

## Scenario 3 — Public mosaic + lightbox (FR-010…FR-012)

1. On `/landing-v2`, scroll to `#galeria`; on `/`, scroll to "Nuestro trabajo".
2. Confirm the responsive mosaic (1/2/3/4 columns by width) with lazy images and no horizontal scroll
   at 320–1920px.
3. Click a tile → lightbox opens with enlarged image + title/category.
4. Keyboard: `ArrowRight`/`ArrowLeft` navigate, `Escape` closes, focus returns to the opening tile.
5. Enable `prefers-reduced-motion` → no transitions/shimmer.
6. Deactivate every item in the admin → both sections show the empty state without breaking.

Expected: accessible mosaic + lightbox on both landings; empty state is graceful.

## Scenario 4 — Delete the static gallery content (FR-010/FR-011)

1. Search `src/` for `GALLERY_ITEMS` and the old static `GalleryItem` interface.
2. Confirm the only remaining references are the demo seed (`src/lib/data/gallery.ts`) and docs.

Expected: landings no longer import a hardcoded gallery; data is the single source.

## Scenario 5 — Realtime gallery updates (FR-014)

1. Open `/landing-v2` (or `/`) in tab A and `/admin?tab=gallery` in tab B.
2. In tab B upload an **active** photo → it appears in tab A's gallery within ~5 s **without a reload**.
3. Deactivate it in tab B → it disappears from the open tab A gallery without a reload (also true for
   delete).
4. Simulate an unavailable transport → the open section keeps the last known content and the
   focus/visibility fallback still refreshes when the tab is revisited.

Expected: gallery live-syncs; failures are non-blocking.

## Scenario 6 — Regression

1. Run `npm run check`, `npm run build`, `npm run lint`.
2. Spot-check `/booking`, `/catalog` and both landings (nav, services, team) for any regression.
3. Confirm the sitemap build still succeeds.

Expected: unrelated pages/routes unchanged; all gates pass.