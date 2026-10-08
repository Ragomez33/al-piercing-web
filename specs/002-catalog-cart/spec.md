# Feature Specification: Product Catalog & Floating Cart

**Feature Branch**: `002-catalog-cart`

**Created**: 2026-10-07

**Status**: Implemented

**Input**: User description: "Build the Product Catalog module and the Floating Cart logic with WhatsApp checkout (catalog page), using the Dark Premium design system variables and an interactive Svelte island for client-side state. Cart store: array of items (product: id, name, priceCents, image, category + quantity) with add, remove, update quantity, clear; reactive dollar total (tabular-nums) and item count; WhatsApp formatter producing wa.me/{phone}?text={encoded} with per-line items, total and a preferred payment method (Pago Móvil / Binance Pay / Efectivo)."

## Clarifications

### Session 2026-10-07

- Q: When should a product card show the gold low-stock badge, and where does the "few units" information come from? → A: Each product carries a numeric `stock` field (units remaining); the badge shows when `0 < stock ≤ 5`, and the add-to-cart action is disabled/hidden when `stock = 0`.
- Q: How should the product grid's add-to-cart buttons and category filter work, given CartDrawer is the only interactive island and only four files (cart.ts, ProductCard.svelte, CartDrawer.svelte, catalog.astro)? → A: The grid stays static HTML in catalog.astro; the CartDrawer island (client:load) attaches delegated listeners to the add buttons and drives the category filter (Aftercare, Joyería, Insumos) over the static grid; no extra files or islands.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse catalog & add products (Priority: P1)

A visitor opens the catalog, sees the products (body jewelry, aftercare, insumos) with name, category, price and image, and adds a product to the cart with a single tap. Adding a product that is already in the cart increases its quantity instead of creating a duplicate line. A floating cart indicator shows the current item count at all times.

**Why this priority**: Add-to-cart is the primary conversion action of the module; without it the catalog has no purpose.

**Independent Test**: Open the catalog, confirm the product grid renders each product (name, category, price, image), tap a product's add button, and confirm the floating cart indicator count increments.

**Acceptance Scenarios**:

1. **Given** the catalog page is open, **When** the visitor views the product grid, **Then** every product shows its name, category, price (dollars, 2 decimals) and image.
2. **Given** a product card, **When** the visitor taps the add action, **Then** the product is added to the cart and the floating indicator count increases by one.
3. **Given** a product already in the cart, **When** the visitor adds it again, **Then** its quantity increases and no duplicate line appears.
4. **Given** the catalog page shows category pills, **When** the visitor selects a category (Aftercare, Joyería or Insumos), **Then** only products of that category remain visible in the grid (FR-012).

---

### User Story 2 - Manage the floating cart (Priority: P2)

A visitor opens the floating cart to review their items, change quantities, remove a single item or clear the whole cart, and sees the running total update instantly with every change.

**Why this priority**: Quantity control and accurate totals are required before checkout and are independently usable.

**Independent Test**: Open the cart with two items, increment/decrement quantities, remove one item, clear the cart, and confirm the total and item count always match the lines shown.

**Acceptance Scenarios**:

1. **Given** the cart contains items, **When** the visitor opens the floating cart, **Then** each line shows the product, quantity controls and unit price.
2. **Given** an item in the cart, **When** the visitor adjusts its quantity, **Then** the line price and the cart total update instantly and correctly to the cent.
3. **Given** the cart, **When** the visitor removes one item or clears all, **Then** the cart reflects the change and the item count and total update accordingly.

---

### User Story 3 - Checkout via WhatsApp (Priority: P3)

With a non-empty cart, the visitor picks a preferred payment method (Pago Móvil, Binance Pay or Efectivo) and taps checkout, which opens WhatsApp with a pre-composed order message listing each line (quantity × name (price)), the total and the chosen payment method, addressed to the studio's number.

**Why this priority**: Checkout is the completion of the order flow, but it builds on the previous two stories.

**Independent Test**: With a non-empty cart, choose a payment method, tap checkout, and confirm the generated message contains every line, the total and the payment method. An empty cart MUST not allow checkout.

**Acceptance Scenarios**:

1. **Given** the cart is not empty, **When** the visitor selects a payment method and taps checkout, **Then** a WhatsApp conversation opens pre-filled with the studio number and a message containing every item, the total and the selected payment method.
2. **Given** the cart is empty, **When** the visitor tries to check out, **Then** checkout is unavailable (the action is disabled).
3. **Given** product names contain accents or special characters, **When** the message is generated, **Then** the characters are delivered intact (no garbled text).

---

### Edge Cases

- What happens when the visitor opens checkout with an empty cart? The checkout action MUST be disabled and no link generated.
- What happens when a quantity is decremented to zero? The item is removed from the cart (or the decrement stops at 1 and removal is explicit) — behavior MUST be consistent and documented.
- What happens when a product has 0 units remaining? The add-to-cart action for that product MUST be disabled/hidden and no line can be added (FR-011).
- What happens when a product name is very long or contains emojis/accents? The generated message MUST preserve the text and encode the link correctly.
- What happens when the device has no WhatsApp installed? The standard link mechanism MUST still open the correct fallback (WhatsApp Web) without errors.
- What happens with many items or large totals? Totals MUST remain correct to the cent and the message must list every line.
- What happens on small (≈320px) screens? The catalog grid and floating cart MUST remain usable without horizontal scroll.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog page MUST display all available products with name, category, price (in dollars formatted with 2 decimals) and an image.
- **FR-002**: The visitor MUST be able to add a product to the cart with a single tap; adding an existing product MUST increment its quantity instead of duplicating the line.
- **FR-003**: A floating cart indicator visible from the catalog MUST show the current item count and total at all times.
- **FR-004**: The visitor MUST be able to open the cart to review items, adjust quantities, remove a single item and clear the entire cart.
- **FR-005**: Cart totals and line prices MUST always be displayed in dollar format with 2 decimals and tabular numerals, and calculated exactly to the cent (no rounding errors).
- **FR-006**: The visitor MUST be able to choose a preferred payment method among Pago Móvil, Binance Pay and Efectivo before checkout.
- **FR-007**: Checkout MUST generate a pre-filled WhatsApp message to the studio's number containing every cart line (quantity × name (price)), the total and the chosen payment method, using the standard link mechanism for WhatsApp.
- **FR-008**: Checkout MUST be impossible (disabled) when the cart is empty.
- **FR-009**: Product names with accents or special characters MUST be preserved intact in the generated message.
- **FR-010**: The catalog and floating cart MUST follow the established visual identity (**tokens only**) and remain usable without horizontal scroll from small mobile to desktop widths.
- **FR-011**: A product card MUST show a gold low-stock badge when the product's remaining units are between 1 and 5 inclusive, and MUST prevent adding a product that has 0 units remaining (clarification 2026-10-07).
- **FR-012**: The catalog page MUST offer category filtering (Aftercare, Joyería, Insumos) that narrows the visible product grid, plus an "all" view, with the filter driven by the single interactive cart island over the static grid (clarification 2026-10-07).

### Key Entities *(include if feature involves data)*

- **Product**: an item offered in the catalog; attributes are an identifier, name, price (in cents), an image reference, a category (Aftercare, Joyería, Insumos) and a `stock` count (units remaining, integer ≥ 0).
- **CartItem**: one product line in the cart; consists of a product and a positive quantity.
- **Cart**: the ordered set of items the visitor is purchasing; exposes the running item count and the total amount in cents.
- **OrderMessage**: the customer-facing text sent to WhatsApp; contains one line per cart item, the total and the selected payment method.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can add a product to the cart in at most 2 taps from the catalog page.
- **SC-002**: The floating cart item count updates within the same interaction when a product is added.
- **SC-003**: From a non-empty cart, a visitor can reach the WhatsApp checkout with the full order pre-filled in at most 3 taps.
- **SC-004**: All totals shown are correct to the cent for every valid combination of quantities.
- **SC-005**: 90% of test users complete a WhatsApp order message on their first attempt.
- **SC-006**: The generated WhatsApp message contains every cart line, the total and the selected payment method, with characters intact.

## Assumptions

- Product data is static content for this version (no content management system or admin wiring yet); the catalog renders a maintained product list (`src/lib/types/content.ts`).
- The studio's WhatsApp number is preconfigured before the feature ships (a single configurable value used by checkout, `src/lib/config.ts`).
- The preferred payment method defaults to Pago Móvil; the visitor can switch to Binance Pay or Efectivo.
- Prices are stored and computed as integer cents; display converts to dollars with 2 decimals.
- A product quantity may be any value of 1 or more; removing an item is an explicit action (and decrementing below 1 does not corrupt the cart).
- The floating cart is the only checkout entry point in this feature (persistent cart drawer); the booking deposit flow is a separate feature.
- Cart state is session-scoped on the client (not persisted across visits by the backend).
