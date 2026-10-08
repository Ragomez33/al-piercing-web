# Research: Product Catalog & Floating Cart

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 0 (Outline & Research)
**Clarifications applied**: 2026-10-07 (Q1 low-stock/`stock` field; Q2 single-island, 4 files)

## 1. Cart Store Design (Svelte)

- **Decision**: A Svelte store on `svelte/store` — `writable<CartItem[]>` plus `derived`
  `itemCount` / `totalCents`, with pure functions `addToCart`, `removeFromCart`,
  `updateQuantity`, `clearCart`, `formatCents` and `buildWhatsAppLink`.
- **Rationale**: Explicitly requested by the feature; `derived` totals are reactive by
  construction; pure functions stay testable without a DOM.
- **Alternatives considered**: Svelte 5 runes module (idiomatic but not the requested shape);
  a plain global object (no reactivity).

## 2. Money Handling & Display

- **Decision**: Integer cents for storage/math; `Intl.NumberFormat("en-US", { style:
  "currency", currency: "USD" })` + CSS `font-variant-numeric: tabular-nums` for display.
- **Rationale**: Constitution Principle IV (no float rounding); `Intl` renders "$10.00";
  tabular-nums matches the design system.
- **Alternatives considered**: `(cents/100).toFixed(2)` string building (locale-fragile);
  float dollars (forbidden by constitution).

## 3. WhatsApp Deep Links

- **Decision**: `https://wa.me/{phone}?text={encodeURIComponent(message)}`; message template
  from the cart contract (lines `- {qty}x {name} ({price})`, `Total: {total}`,
  `Método de pago de preferencia: {method}`); checkout button label **"Enviar Pedido por
  WhatsApp"**.
- **Rationale**: `wa.me` is standard and self-fallback to Web; `encodeURIComponent` preserves
  accents/emoji (FR-009). No link is produced for an empty cart (FR-008).
- **Alternatives considered**: `api.whatsapp.com/send` alias (equivalent); share API (flaky).

## 4. Product Data & Low-Stock (clarification Q1)

- **Decision**: Typed static content in `src/lib/types/content.ts`: `Product` now includes a
  numeric `stock` field (units remaining, integer ≥ 0). Low-stock badge shows when
  `0 < stock ≤ 5`; the add action is disabled/hidden when `stock = 0`.
- **Rationale**: Truthful, testable badge per FR-011; keeps content static (no CMS yet);
  product images under `public/images/products/` with `data-fallback`.
- **Alternatives considered**: Editorial boolean `lowStock` (not truthful, rejected);
  deferring the badge (rejected — user asked for it).

## 5. Island Architecture & Static-Grid Delegation (clarification Q2)

- **Decision**: `catalog.astro` statically renders the grid: each `ProductCard` is
  **SSR-only** (no `client:` directive) with `data-add-to-cart="{product.id}"` on its add
  button, plus category pills `data-category="{value}"`. The **single** island
  `CartDrawer.svelte` (`client:load`) attaches document-level delegated listeners for
  `[data-add-to-cart]` (→ `addToCart`) and `[data-category]` (→ toggle a `.is-hidden`
  class on grid items), and renders the FAB + drawer from the shared store.
- **Rationale**: Honors "exactly 4 files" and one island (constitution P1); the grid stays
  static/SSR; no per-card hydration; filter and add work as progressive enhancement over
  real HTML buttons (accessible by default). FAB lives inside `CartDrawer`.
- **Alternatives considered**: Root `CatalogPage` island containing grid+drawer (superseded —
  adds a file and moves the grid off SSR); two islands sharing the store (5th file, two
  hydrations — rejected); one island per card (many hydrations — rejected).

## 6. Cart Persistence (session vs. browser storage)

- **Decision**: In-memory store for v1 (current page session; not restored on reload).
- **Rationale**: Simplest correct behavior for a WhatsApp checkout flow (spec assumption).
- **Alternatives considered**: `localStorage` hydration (better reload UX but adds staleness,
  quota and a sync layer — revisit if requested).

## 7. Catalog Page Shell & Filtering

- **Decision**: `catalog.astro` uses `BaseLayout`; a heading plus category pills
  (Aftercare, Joyería, Insumos + "Todos") sit above the responsive grid; the island toggles
  item visibility by `data-category` match; grid columns 1–2 mobile → 4 desktop.
- **Rationale**: Filter is progressive enhancement over the static grid; ARIA
  (`aria-pressed` on pills, `aria-live` on counts) keeps it accessible.
- **Alternatives considered**: URL query filtering (server round-trip, loses instant feel).

## Design-Token Note

`ProductCard` visual rules (clarification, Dark Premium theme): charcoal `#1A1A1E` card,
`1px solid #2E2E36` border, 16px radius, `0 8px 24px rgba(0,0,0,0.45)` shadow → map to existing
tokens (`--bg-card-light`, `--border-card`, `--radius-card`, `--shadow-card`); image container
`#242429` (`--bg-surface-elevated`) with 14px radius; category pill `#202024`
(`--bg-badge-pill`); low-stock badge `#E5A93C` (`--accent-gold`); add button `#E5A93C`
(`--accent-primary`, `--accent-on` text). New tokens (e.g. `--radius-image: 14px`) MUST be added
to `tokens.css` first (Design Parity).