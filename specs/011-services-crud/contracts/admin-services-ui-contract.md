# Contract: Admin Services Section (CRUD UI)

**Feature**: 011-services-crud

Governs the new **Servicios** section in `src/components/admin/AdminPanel.svelte` (existing `client:load`
island, dashboard shell from feature 010). Follows the Inventario patterns and provides full CRUD
(create, edit, activate/deactivate and delete).

## 1. Navigation

- The sidebar gains a third item **Servicios** (icon, e.g. `Sparkles`/`Tag`) alongside Calendario and
  Inventario.
- It uses the same active/hover/gold-active treatment and updates the `?tab=` query
  (`?tab=services`).

## 2. List

- Loads all services via `dataStore.listServices({ includeInactive: true })`.
- Each row shows: **name**, **category**, **price** (`formatCents`, `tabular-nums`), **duration**
  (`{n} min`) and an **active** state control.
- Empty state: "No hay servicios cargados." with the create action available.
- Loading hint and `role="alert"` error on load failure.

## 3. Create

- A **Nuevo Servicio** action opens a modal form with labeled controls:
  - `Nombre` (text, required)
  - `Categoría` (select from the fixed categories)
  - `Descripción` (textarea)
  - `Precio (centavos)` (number, integer ≥ 0)
  - `Duración (min)` (number, integer > 0)
  - `Requiere seña` (checkbox, default true)
- On submit: validate locally (name non-empty, price integer ≥ 0, duration integer > 0), then
  `dataStore.createService(input)`. On success close the modal and reload the list; on failure show the
  `DataError` in a `role="alert"` and keep the modal open.

## 4. Edit

- Each row offers **Editar**, opening the same modal pre-filled; submit calls
  `dataStore.updateService(id, patch)` and reloads. The service `id` is a UUID and is never edited.

## 5. Activate / Deactivate / Delete

- A toggle per row (like the product `published` switch) calls
  `dataStore.updateService(id, { active: !active })`.
- Deactivated services remain listed (marked inactive) and can be reactivated; they disappear from the
  public booking menu (booking-menu-contract §2).
- A **Eliminar** action per row (destructive, behind a confirmation step) calls
  `dataStore.deleteService(id)`; on success the row is removed and the list reloads. Existing bookings
  keep their snapshot (`service_id` becomes `null`).
- Buttons/toggles disable while their action is in flight (no double submit).

## 6. Validation & integrity

- Money inputs are integer **cents**; helper text clarifies cents (e.g. `2500 = $25.00`).
- Validation messages are specific and visible (`role="alert"`).
- No optimistic mutation: the list reflects the persisted result (reload after success).

## 7. Accessibility & tokens

- Modal is `role="dialog"` `aria-modal` with an accessible name; Escape/backdrop close; focus management.
- Controls use `.input`/`.field`; buttons reuse the feature-010 button tokens; targets ≥44px; visible
  focus; `prefers-reduced-motion` honored; no horizontal scroll 320–1920px; only tokens (no raw values).
