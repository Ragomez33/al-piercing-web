# Contract: Admin Gallery Tab

**Feature**: `016-gallery-module` | Applies to `src/components/admin/AdminPanel.svelte`.

## 1. Tab integration

- Extend `AdminTab` union with `"gallery"`; `?tab=gallery` is honored by `switchTab()` and the
  `onMount` URL parse (mirroring the other tabs).
- Sidebar order: **Calendario · Inventario · Servicios · Galería · Equipo**; the Galería button uses the
  lucide `Image` icon and the same `side-link` styling/active semantics.
- `switchTab("gallery")` triggers the initial `refreshGallery()`.

## 2. List state (flicker-free, feature-015 pattern)

State per list: `{ items: GalleryItemRecord[], loaded: boolean, loading: boolean, error: string, busy: Record<string, boolean> }`.

- The "Cargando galería…" placeholder renders **only when `!loaded`**.
- After the first successful load, mutations patch `items` in place from the mutation return value and
  never call a full re-fetch:
  - create → append the returned record;
  - toggle → replace the item by `id` with the returned record;
  - delete → filter the item out after the promise resolves.
- Per-card `busy[id]` disables controls, adds `class:busy`/`aria-busy` (token-styled opacity) and stays
  set until the mutation settles (`finally`).
- Failures keep the previous `items` and show an inline `galleryError`; the grid never blanks.

## 3. Card grid

- Responsive grid (1 → 2 → 3 columns at breakpoints), each card: square thumbnail (`aspect-ratio`,
  `loading="lazy"`, `data-fallback` placeholder), title (or muted "Sin título"), a category chip and
  the state row with an **activar/desactivar switch** (mirroring the services/team toggles) and an
  **Eliminar** button.
- Inactive cards show a `Oculta` chip like the other lists.

## 4. Upload modal

- Reached via a "Nueva foto" button; form fields:
  - file input (image only; invalid type → inline `DataError` message, no upload),
  - **live preview** (`URL.createObjectURL`, revoked on close/replace),
  - optional **title** input,
  - **category** input with a `<datalist>` of suggestions: `NOSTRIL, HELIX, NAVEL, TITANIO, Otro`
    (free-form allowed).
- On submit: `uploadImage(file, { prefix: "gallery-" })` → `createGalleryItem({ title, category, imageUrl })`.
- Busy state while uploading ("Subiendo imagen…"); failures clear nothing already shown; success appends
  the card in place and closes the modal.

## 5. Delete confirmation

- "Eliminar" opens a confirmation dialog (mirrors the service delete); confirming calls
  `deleteGalleryItem(id)` and removes the card only after the promise resolves; cancel keeps it.
- Failed delete keeps the card and shows an inline error.

## 6. Empty/loading states

- No items → `"No hay fotos en la galería."` empty state.
- First load → placeholder + `aria-live` "Cargando galería…".
- Upload failure / toggle failure → inline `role="alert"` message, previous grid intact.

## 7. Acceptance mapping

FR-005…FR-009 → this contract; verified by `quickstart.md` scenario 2.