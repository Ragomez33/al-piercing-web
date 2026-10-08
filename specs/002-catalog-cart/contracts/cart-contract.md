# Cart Contract: Product Catalog & Floating Cart

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
**Clarifications applied**: 2026-10-07 (Q1 `stock`; Q2 single-island + static-grid delegation).

Defines the client-side contract: the cart store, the WhatsApp message, and the UI wiring of
the single interactive island over the static grid (backed by [`data-model.md`](../data-model.md)).

## 1. Store Contract

```ts
// src/stores/cart.ts — strict TypeScript, integer-cents (constitution PIII/PIV)
import { writable, derived } from "svelte/store";
import type { Product, PaymentMethod } from "../lib/types/content";

export type CartItem = { product: Product; quantity: number };

export const cart = writable<CartItem[]>([]);               // ground truth items
export const itemCount = derived(cart, ...);                // sum of quantities
export const totalCents = derived(cart, ...);               // sum priceCents*quantity

export function addToCart(product: Product): void;          // increments if id exists
export function removeFromCart(productId: string): void;
export function updateQuantity(productId: string, delta: number): void; // ≤0 => remove
export function clearCart(): void;

export function formatCents(cents: number): string;         // "$12.50" (Intl, USD)
export function buildWhatsAppLink(options: {
  phone: string;               // digits only
  items: CartItem[];
  paymentMethod: PaymentMethod;
}): string | null;             // null when items empty (FR-008)
```

## 2. WhatsApp Message Contract

Template (lines joined with `\n`, then `encodeURIComponent`):

```text
Hola! Quiero solicitar los siguientes productos:
- {quantity}x {name} ({price})
- {quantity}x {name} ({price})
...
Total: {total}
Método de pago de preferencia: {method}
```

Rules: one line per item in cart order; prices/total in dollars with 2 decimals; `method`
from PAY-01; empty cart → no link; accents/emoji preserved (FR-009); button label
**"Enviar Pedido por WhatsApp"**.

## 3. UI Contract (static grid + single island)

### catalog.astro (static SSR shell)
- Uses `BaseLayout`; renders a page title and category pills (Aftercare, Joyería, Insumos +
  "Todos") with `data-category="{value}"` (default "all").
- Renders the responsive grid of `ProductCard` **server-side, without `client:`** (SSR-only).
- Mounts the single island: `<CartDrawer client:load />`.

### ProductCard.svelte (SSR presentational)
- Card: charcoal `#1A1A1E` (`--bg-card-light`), border `1px solid #2E2E36` (`--border-card`),
  radius `16px` (`--radius-card`), shadow `0 8px 24px rgba(0,0,0,0.45)` (`--shadow-card`).
- Image container `#242429` (`--bg-surface-elevated`) with `14px` radius; `data-fallback`
  for missing media.
- Category pill `#202024` (`--bg-badge-pill`); name + price bold with `tabular-nums`.
- Gold low-stock badge `#E5A93C` (`--accent-gold`) when `0 < stock ≤ 5`; add button
  `#E5A93C` (`--accent-primary`, `rounded-full`) carrying `data-add-to-cart="{product.id}"`;
  when `stock = 0` the add control is disabled/hidden (FR-011).

### CartDrawer.svelte (the single island, `client:load`)
- **FAB**: circular `#E5A93C` with cart icon, item-count badge, projected shadow
  `rgba(229, 169, 60, 0.25)` (`--shadow-glow`); opens the drawer; badge hidden at 0.
- **Delegation**: on mount, binds document-level listeners for `[data-add-to-cart]` (→
  `addToCart`) and `[data-category]` (→ toggle `.is-hidden` on grid items by category).
- **Drawer**: charcoal surface + dark translucent backdrop; `role="dialog"`
  + accessible name; line list with `＋/－` (`updateQuantity`), remove (`removeFromCart`),
  clear ("Vaciar carrito"); footer with `itemCount` + `totalCents` (`tabular-nums`,
  `aria-live`); payment selector (PAY-01, default `pago_movil`); checkout button
  "Enviar Pedido por WhatsApp" powered by `buildWhatsAppLink` (`WHATSAPP_PHONE`), **disabled
  when cart empty**; focus moves in/out, `Escape` + backdrop close.