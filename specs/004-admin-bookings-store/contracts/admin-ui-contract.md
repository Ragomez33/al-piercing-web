# Admin UI Contract: Admin Dashboard, Bookings & Hybrid Data Layer

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

## 1. Route & Tab Contract

- Page `/admin` renders the `AdminPanel` island (`client:load`).
- Tab switch via query string: `/admin?tab=bookings` (default) and `/admin?tab=catalog`. The island
  reads `tab` on mount and updates the URL when the tab changes (history-safe).

## 2. PIN Gate (US1 / FR-010)

- While locked: a single labeled PIN input + "Desbloquear" button; invalid input shows an inline
  error and keeps the panel locked.
- Correct PIN → write `alpi:admin:unlocked` (`sessionStorage`) and render the tabs.
- A "Bloquear" action clears the flag and relocks.
- The gate MUST NOT render any booking/product data while locked.

## 3. Bookings Tab (`?tab=bookings`)

- **Filter**: a `<input type="date">` ("Agenda por fecha") that filters the visible list to the
  day; an empty value shows all.
- **List/table** (table on desktop, stacked cards on mobile) with columns:
  Client (name + WhatsApp), Service, Date/Time, Status badge, Deposit (50%).
  Status badges: `PENDING` → `--accent-gold`, `CONFIRMED` → `--accent-positive`,
  `CANCELLED` → `--accent-negative`.
- **Row actions**:
  - `[Confirmar Cita]` — only when `status === "PENDING"` → calls
    `dataStore.updateBookingStatus(id, "CONFIRMED")`.
  - `[Cancelar]` — only when `status !== "CANCELLED"` → calls
    `dataStore.updateBookingStatus(id, "CANCELLED")`.
- Empty state text when a filtered day has no bookings.
- Token-only styling; actions ≥ 44px with labels and focus states.

## 4. Catalog Tab (`?tab=catalog`)

- **Table** (desktop) / cards (mobile): image, name, category, price, stock, published toggle.
- **Inline stock edit**: a number input per row with a save button (or commit on blur); saves via
  `dataStore.updateProduct(id, { stock })`.
- **Publish toggle**: a switch per row calling `dataStore.updateProduct(id, { published })`;
  unpublished rows are dimmed and a "Oculto" chip is shown.
- **Add product**: `[Nuevo Producto]` opens a modal (dialog) with fields: Nombre, Categoría (the
  three catalog categories), Precio en centavos, Stock, Imagen (reference/URL with placeholder
  fallback). Valid on name non-empty, category valid, `priceCents ≥ 0`, `stock ≥ 0`; validation
  errors inline. Submit calls `dataStore.createProduct(...)`; on success the row appears immediately
  (FR-018) and both the admin table and public catalog reflect it (FR-016/FR-017).
- The "Agregado" image preview falls back to `/images/products/placeholder.svg`.

## 5. Accessibility & Visual Rules

- Dark Premium tokens only (`--bg-app-body` `#111113`, `--bg-card-light` `#1A1A1E`,
  `--bg-surface-elevated` `#242429`, `--accent-primary` `#E5A93C`, `--shadow-glow`, status tokens).
- `<label>`/`<legend>` pairing, `dialog` semantics for the modal, focus trap, `Escape` close,
  `aria-pressed` on the publish toggle, `aria-live` for status changes, ≥ 44px targets, no horizontal
  scroll at 320px.