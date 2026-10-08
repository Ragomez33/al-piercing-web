# Data Model: Product Catalog & Floating Cart

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
**Clarifications applied**: 2026-10-07 (Q1 adds `stock`; Q2 restricts component set).

> **Nature**: Client-side state + static content only. No persistence layer, migrations or
> backend writes. Clarification Q1 adds a `stock` field to `Product`.

## Entities

### PRD-01 · Product
An item offered in the catalog (body jewelry, Aftercare, Insumos).
| Field | Type | Validation |
| --- | --- | --- |
| `id` | string | REQUIRED, non-empty, unique across catalog |
| `name` | string | REQUIRED, non-empty |
| `priceCents` | integer | REQUIRED, ≥ 0 (money as integer cents) |
| `image` | asset reference | REQUIRED at runtime; missing media falls back to placeholder |
| `category` | `"Aftercare" \| "Joyería" \| "Insumos"` | REQUIRED |
| `stock` | integer | REQUIRED, ≥ 0 (units remaining) — added by clarification 2026-10-07 |

Low-stock rule (FR-011): the card shows a gold badge when `0 < stock ≤ 5`; the add-to-cart
action is disabled/hidden when `stock = 0`.

Current static set (`PRODUCTS`): `hoop-titanium`, `barbell-titanium`, `septum-horseshoe`
(Joyería); `aftercare-balm`, `aftercare-soap` (Aftercare); `piercing-solution` (Insumos).

### CRT-01 · CartItem
One product line in the cart.
| Field | Type | Validation |
| --- | --- | --- |
| `product` | Product | REQUIRED (embedded object) |
| `quantity` | integer | REQUIRED, ≥ 1 |

### CRT-02 · Cart (state)
The ordered purchase state (client store).
| Field | Type | Validation |
| --- | --- | --- |
| `items` | CartItem[] | Order = insertion order |
| `itemCount` | derived integer | Sum of `quantity` across items |
| `totalCents` | derived integer | Sum of `priceCents * quantity` (never float) |

### PAY-01 · PaymentMethod
Preference selected at checkout.
| Value | Label |
| --- | --- |
| `pago_movil` | Pago Móvil (default) |
| `binance_pay` | Binance Pay |
| `efectivo` | Efectivo |

### ORD-01 · OrderMessage
Message composed for WhatsApp checkout (not persisted).
| Field | Type | Validation |
| --- | --- | --- |
| `lines` | string per item | `- {quantity}x {name} (${price})` |
| `total` | string | `${total}` (2 decimals) |
| `paymentMethod` | string | Selected label from PAY-01 |
| `phone` | digits string | Configured studio number (non-empty, digits only) |

## Relationships

- `Cart` → `CartItem[]` → `Product` (composition; product data embedded per line).
- `OrderMessage` derives from `Cart` (lines + total), `PaymentMethod` and the phone config.

## Validation Rules (state-level, quoted from spec)

- "Adding a product already in the cart MUST increment its quantity instead of duplicating the line" (FR-002) — key = `product.id`.
- "Totals calculated exactly to the cent" (FR-005) — integer math only.
- "Checkout MUST be impossible (disabled) when the cart is empty" (FR-008).
- "Product names with accents or special characters MUST be preserved intact" (FR-009).
- "A product card MUST show a gold low-stock badge when `0 < stock ≤ 5` and MUST prevent adding at `stock = 0`" (FR-011).
- "The catalog page MUST offer category filtering (Aftercare, Joyería, Insumos) plus an all view over the static grid" (FR-012).

## State Transitions

Cart lifecycle (synchronous, in the store):

```
Empty
  │  addToCart(product)  [add disabled when product.stock = 0]
  ▼
Non-empty ── updateQuantity(+/-) ──► Non-empty (quantity ≤ 0 → line removed)
  │  removeFromCart(productId) ────► Non-empty | Empty
  │  clearCart() ──────────────────► Empty
  │
  └─ [checkout enabled when non-empty] → OrderMessage → WhatsApp link
```

- `updateQuantity(productId, delta)`: resulting quantity ≤ 0 removes the line.
- Totals/itemCount always recomputed from the current items (never cached stale).

> **Note**: `formatCents` lives in `src/lib/utils/money.ts` and is re-exported by
> `src/stores/cart.ts`; `buildWhatsAppLink` remains in the cart store.
