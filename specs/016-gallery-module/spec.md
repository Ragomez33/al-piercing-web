# Feature Specification: Galería / Nuestro Trabajo — Managed Gallery Module

**Feature Branch**: `016-gallery-module`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Implementa el módulo completo de Galería / Nuestro Trabajo para ALPIERCING: 1. Base de Datos & Tipos: define el tipo GalleryItem (id, title, category, image_url, is_active, created_at); agrega al DataStore listGalleryItems(), createGalleryItem(), deleteGalleryItem(), toggleGalleryItemActive(); crea la migración supabase/migrations/0007_gallery.sql (tabla public.gallery_items, RLS y permisos); data semilla en el adaptador local. 2. Pestaña Galería en AdminPanel.svelte (?tab=gallery): grid responsive de tarjetas, subir fotos con uploadImage(file, { prefix: 'gallery-' }) con vista previa en vivo, título opcional y categoría, confirmación para eliminar y switch activar/desactivar, sin flicker. 3. Renderizado en Landings: en landing-v2.astro sección #galeria reemplazar placeholder estático por componente dinámico con dataStore.listGalleryItems(), grid mosaico/masonry con lightbox; en index.astro crear/actualizar sección Nuestro Trabajo con los mismos items; realtime: suscribir la sección de galería a realtime.ts para que se actualice al subir fotos desde el admin. Al finalizar ejecutar npx astro check y npm run build."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage the studio's work photos from the admin (Priority: P1)

A studio operator opens the admin area and finds a **Galería** section. They see all uploaded photos — active and inactive — as a responsive grid of cards showing the image, an optional title, the category and the current visibility state. From there they can upload a new photo (seeing a live preview before saving, with an optional title and a category), deactivate/reactivate a photo with a switch so it is hidden or shown to visitors, and delete a photo after a confirmation step. Every action reflects on the list immediately without any blanking or flicker, and failures keep the previous data with a visible message.

**Why this priority**: Management is the foundation of the module — without it there is no content to show visitors.

**Independent Test**: Open the admin Galleries tab, upload a photo (confirm the live preview), save it, see the new card appear in place; toggle a card off and on; delete a card via the confirmation dialog and confirm the list updates without flashing; force a failure and confirm the item remains with an error message.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they open the Galleries tab, **Then** all photos (active and inactive) appear as responsive cards with image, title, category and visibility state.
2. **Given** a valid image file, **When** the operator uploads it with an optional title and category, **Then** a live preview is shown, the item is saved, becomes active by default and appears in the grid.
3. **Given** a photo card, **When** the operator activates/deactivates it, **Then** the switch reflects immediately without a full-list reload and other rows stay mounted.
4. **Given** a delete request for a photo, **When** the operator confirms, **Then** the photo is permanently removed; cancelling leaves it intact.
5. **Given** a failed create/delete/toggle, **When** the data layer rejects it, **Then** the previous data remains visible and an inline error is shown.

---

### User Story 2 - Show the studio's work to visitors on both lands (Priority: P1)

A visitor on either landing page sees a **Galería / Nuestro Trabajo** section populated from the studio's managed photo collection (only active photos). Photos appear in a responsive mosaic/masonry grid; tapping or clicking a photo opens a lightbox that enlarges it with its title/category, can be moved through with arrows and closed with Esc or the close control, and returns focus where it was opened from.

**Why this priority**: This delivers the visitor-facing value of the module on both lands and replaces the previously static placeholder gallery.

**Independent Test**: Open each landing, confirm both gallery sections render only active items in a mosaic that never scrolls horizontally; click a photo to open the lightbox, step forward/back with arrows, close with Esc and confirm focus returns to the opener.

**Acceptance Scenarios**:

1. **Given** published gallery photos, **When** a visitor opens either landing, **Then** the gallery section shows only active photos in a responsive mosaic with no horizontal page scroll from 320px to 1920px.
2. **Given** a gallery photo, **When** the visitor activates it, **Then** a lightbox opens with the enlarged image and its title/category; arrows navigate, Esc and the close control close it, and focus returns to the square that opened it.
3. **Given** no active photos, **When** the gallery sections render, **Then** an elegant empty state is shown and neither landing breaks.
4. **Given** a read failure with no local fallback, **When** the gallery loads, **Then** a non-blocking notice is shown instead of a blank or broken section.

---

### User Story 3 - See gallery changes live without reloading (Priority: P2)

While a visitor is viewing a landing, the operator uploads, deactivates or deletes photos in the admin; the open gallery section refreshes itself with the latest active photos without a manual page reload.

**Why this priority**: Keeps the public gallery accurate in real time; the gallery remains fully usable without it (US2).

**Independent Test**: With a landing open showing the gallery, publish and deactivate photos through the admin and confirm the open section updates within a short delay without reload or scroll jump.

**Acceptance Scenarios**:

1. **Given** a landing with the gallery open, **When** the operator uploads an active photo, **Then** it appears in the open section without a manual reload.
2. **Given** a landing with the gallery open, **When** the operator deactivates or deletes a photo, **Then** it disappears from the open section without a manual reload.
3. **Given** the live mechanism unavailable, **When** data cannot refresh live, **Then** the section keeps the last known content and remains usable.

---

### Edge Cases

- **No gallery photos** → both landings show an elegant empty state and the section stays neat.
- **Broken or missing image URL** → the card/thumbnails fall back to a placeholder and the layout does not break.
- **Upload of a non-image file or an image that fails to persist** → an inline error is shown, no partial record is created, and the previous grid stays intact.
- **Empty optional title** → the card renders without a caption; the lightbox shows only the category (or nothing).
- **Free-form category with long text** → wraps within its container; no horizontal scroll.
- **Very long titles** → `overflow-wrap: anywhere`, no layout break.
- **Photo deleted while a visitor has the lightbox open on it** → the viewer closes gracefully and the grid remains coherent.
- **Keyboard-only visitor** → lightbox opens/closes with the keyboard, arrows step through photos, focus trap or return-to-opener is honored, and all controls are ≥44×44px.
- **Reduced-motion preference** → lightbox transitions and skeleton shimmer are suppressed.
- **Data read failure** → local fallback content (demo seed) is shown with a non-blocking notice, never a blank area.
- **Deep-link/refresh on either landing** → gallery sections still render coherent content.

## Requirements *(mandatory)*

### Functional Requirements

**Entity & data layer**

- **FR-001**: The product MUST model a managed gallery item with the fields `id`, `title`, `category`, `image_url`, `is_active` and `created_at`.
- **FR-002**: The data layer MUST provide operations to list gallery items (public lists return only active items; the admin list returns all), create an item, delete an item, and toggle an item's active state.
- **FR-003**: Gallery data MUST persist across sessions and restarts in both supported modes (managed database in production and local storage in demo), with parity of behavior.
- **FR-004**: The production data store MUST persist gallery items in a dedicated table protected with the same access-permission pattern as the other managed tables, and persistence changes MUST follow the repository's standard database-change workflow (numbered schema change, regenerated client types).

**Admin management**

- **FR-005**: The admin MUST expose a "Galería" tab (reachable at the gallery tab address) alongside the existing sections.
- **FR-006**: The gallery tab MUST render all items as a responsive grid of cards, each showing the image, title, category and visibility state.
- **FR-007**: The operator MUST be able to upload a new photo with a live preview before saving, an optional title and a category; uploads must target the same media storage used by other admin uploads under a gallery-specific prefix.
- **FR-008**: Every card MUST offer an activate/deactivate switch and a delete action that requires confirmation before any removal.
- **FR-009**: Creating, toggling or deleting an item MUST update the list in place with an inline busy state on the affected card and MUST NOT blank, flash or fully tear down the surrounding grid; failures MUST keep the previous data and show an inline error (flicker-free UX).

**Landing rendering**

- **FR-010**: The alternative landing's gallery section MUST be fed by the managed gallery data (not a code-defined list) and MUST show only active items in a responsive mosaic/masonry grid.
- **FR-011**: The original landing MUST present an equivalent "Nuestro Trabajo" section fed by the same managed items and active filter.
- **FR-012**: Clicking a gallery photo MUST open a lightbox with the enlarged image and its metadata; it MUST be operable with the keyboard (including Esc to close and arrows to navigate), restores focus to the origin square when closed, and honors the reduced-motion preference.
- **FR-013**: Both gallery sections MUST read through the managed data layer with the existing local/demo fallback; a read failure MUST show fallback content with a non-blocking notice instead of a blank area.

**Realtime**

- **FR-014**: While a landing is open, changes made by the operator to gallery items MUST be reflected in the gallery section without a manual reload, using the same change-notification capability the site already has; when it is unavailable the section MUST keep the last known content and remain usable.

**Quality & accessibility**

- **FR-015**: The change MUST NOT alter booking/payment behavior or unrelated routes, MUST stay responsive from 320px to 1920px with no horizontal page scroll and ≥44×44px controls, use only the project's design tokens, and the project's type-check gate MUST pass with zero errors and no type discrepancies.

### Key Entities *(include if feature involves data)*

- **Gallery item**: a managed photo — `id`, optional `title`, `category`, `image_url`, `is_active` (public visibility), `created_at`. Is the single source for the gallery sections on both landings.
- **Gallery card state** (admin): the per-card idle / busy / error state kept while a mutation is pending, mirroring the existing admin list-state pattern.
- **Lightbox state** (visitor): the currently enlarged item and navigation position — client-only, never persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the gallery sections on both landings render from the managed data source with only active items (0 hardcoded gallery items remain in the landing pages).
- **SC-002**: An operator can go from selecting an image file to seeing it published and active in the admin grid and on both open landings within 30 seconds total.
- **SC-003**: Deactivating or deleting a photo hides/removes it from an open public gallery within 5 seconds without any manual reload.
- **SC-004**: During any admin gallery mutation the grid never renders a blank/empty frame and no visible full-list flicker occurs; failed mutations leave the previous data intact.
- **SC-005**: The lightbox can be fully operated with the keyboard (open, next, previous, close) and 100% of its controls measure at least 44×44px; the page shows no horizontal scroll from 320px to 1920px.
- **SC-006**: The project's type-check gate passes with zero errors, the production build succeeds, and unrelated routes/pages keep working.

## Assumptions

- **Category**: an optional short text field. The admin offers a curated suggested set (the four piercing categories plus "Otro") but allows free-form values; the public lightbox simply displays the stored category.
- **Activation semantics**: `is_active` controls public visibility only. Deactivation keeps the item in the studio's collection (visible in admin); deletion removes it permanently after confirmation.
- **Static content superseded**: the previously static gallery placeholder content is replaced on the landings by the managed gallery. The old static entries may remain only as the demo seed served by the data layer's local fallback.
- **Lightbox**: implemented as a small client-side enhancement inside the gallery island; no new dependency is required; keyboard support and reduced-motion are honored.
- **Migration numbering**: the gallery migration continues the existing numbering (`0007`).
- **Realtime scope**: consistent with the existing capability — changes made through the admin appear on open landings without a manual reload; cross-device delivery is available only where the underlying infrastructure supports it.
- **Money/booking**: no monetary or booking logic is touched by this module.
- **Copy**: public copy is in Spanish, following existing conventions.