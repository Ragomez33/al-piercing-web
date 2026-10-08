# Quickstart: Product Catalog & Floating Cart

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
**Clarifications applied**: 2026-10-07 (Q1 `stock`; Q2 single-island/4-file architecture).

Runnable validation guide. Contracts: [cart contract](./contracts/cart-contract.md) ·
Model: [data model](./data-model.md).

## Prerequisites

- Node.js ≥ 22, deps installed (`npm install`).
- Feature files present (exactly the clarified set, plus data/config/media):
  - `src/stores/cart.ts`
  - `src/components/catalog/CartDrawer.svelte` (island)
  - `src/components/catalog/ProductCard.svelte` (SSR presentational)
  - `src/pages/catalog.astro`
  - `src/lib/types/content.ts` (extended: `Product` + `stock`, `PRODUCTS`, `PaymentMethod`)
  - `src/lib/config.ts` (`WHATSAPP_PHONE`)
  - product images under `public/images/products/`

## Setup & Commands

```bash
npm install
npx astro check   # exit 0, zero errors
npm run build     # exit 0
npm run dev       # open http://localhost:4321/catalog
```

## Validation Scenarios

### S1 · Catalog renders statically (FR-001, FR-010)
Open `/catalog`: grid of products shows image, name, category chip and price with 2 decimals
(`tabular-nums`); page has no horizontal scroll at 320–1920px. **Grid is visible even with
JavaScript disabled** (static SSR).

### S2 · Add to cart & badge (FR-002, FR-003, SC-001, SC-002)
1. Tap a product's add button → floating cart count increments by 1 (delegation works).
2. Tap the same product again → quantity increments, no duplicate line.

### S3 · Cart management & totals (FR-004, FR-005, SC-004)
Open drawer with ≥2 items; increment/decrement quantities; remove a line; clear all; confirm
line prices and total are always correct to the cent and the empty state disables checkout.

### S4 · Low-stock badge (FR-011)
1. A product with `stock` between 1 and 5 shows the `--accent-gold` (#E5A93C) badge.
2. A product with `stock = 0` has a disabled/hidden add action and cannot be added.

### S5 · Category filter (FR-012)
Select each pill (Aftercare, Joyería, Insumos, Todos): only matching products remain visible;
selected pill state is evident (`aria-pressed`).

### S6 · WhatsApp checkout (FR-006/007/008/009, SC-003/005/006)
1. With a non-empty cart: select each payment method (Pago Móvil default), tap
   "Enviar Pedido por WhatsApp".
2. Confirm the opened `wa.me` conversation targets the studio number and contains every line
   (`- {qty}x {name} ({price})`), the total, and the chosen method.
3. Include an accented/emoji product name → text arrives intact.
4. Empty cart → checkout button disabled, no link produced.

### S7 · Keyboard & a11y (P5)
FAB opens the drawer; focus moves in/out; `Escape`/backdrop close; pills and buttons
reachable, labeled, targets ≥ 44px; counts/totals announced to screen readers.

## Expected Overall Outcome

`astro check` and `npm run build` exit 0; S1–S7 pass; exactly one island hydrated
(`CartDrawer`); the grid remains static SSR; checkout is a pure WhatsApp deep link.