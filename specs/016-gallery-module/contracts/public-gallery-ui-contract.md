# Contract: Public Gallery (Landings + Lightbox + Realtime)

**Feature**: `016-gallery-module` | Applies to `src/components/landing/LandingGallery.svelte`
(`client:load`), mounted in `src/pages/landing-v2.astro` (`#galeria`) and `src/pages/index.astro`
("Nuestro trabajo" section).

## 1. Data

- Load `dataStore.listGalleryItems()` (active only) on mount with `listFallbackGalleryItems()` as the
  non-blocking fallback; a read failure shows a non-blocking notice, never a blank section.
- Subscribe with `subscribeToDataChanges(["gallery"], …)`: debounce (~150 ms), skip an in-flight
  re-fetch, re-fetch via `listGalleryItems()` and **patch in place** (no teardown, no scroll jump).
  Unsubscribe on destroy. Never throws.

## 2. Mosaic grid

- Responsive CSS-columns mosaic: 1 column (<600px) → 2 (≥600px) → 3 (≥900px) → 4 (≥1200px);
  no horizontal page scroll at 320–1920px.
- Tiles: `aspect-ratio` squares, `loading="lazy"` images with `data-fallback="/images/placeholder.svg"`,
  caption chip (category, else title) — `overflow-wrap: anywhere`.
- Section heading lives in the page (`landing-v2`: "Galería"; `index`: "Nuestro trabajo").
- Empty state: `"No hay fotos por el momento."` graceful card, page intact.

## 3. Lightbox

- Opens on tile click (`button` semantics), `aria-label` per photo + position.
- Overlay: `--overlay-backdrop` + `--z-modal` tokens; enlarged image with title and category; close
  button ≥44×44px; decorative backdrop click also closes.
- Keyboard: `Escape` closes, `ArrowLeft`/`ArrowRight` navigate (wrap), focus moves into the dialog on
  open (`$effect`) and is restored to the originating tile on close; `aria-modal="true"`,
  `role="dialog"`, `aria-label="Foto … (i de n)"`, tabindex handling per focus-trap-in-island scope.
- `prefers-reduced-motion`: no transitions/animation on open/close or skeleton shimmer.
- If the currently-open item disappears mid-view (deleted live), close gracefully.

## 4. Acceptance mapping

FR-010…FR-013, FR-015 → this contract; verified by `quickstart.md` scenarios 3 and 5.