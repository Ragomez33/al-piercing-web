---

description: "Task list for Product Catalog & Floating Cart feature implementation"
---

# Tasks: Product Catalog & Floating Cart

**Input**: Design documents from `/specs/002-catalog-cart/` (incl. clarifications 2026-10-07:
`stock` + low-stock badge, single-island / 4-file architecture)

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is
done through `quickstart.md` scenarios S1–S7 plus `astro check` / `npm run build` gates
(final polish phase).

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro project)
- Store → `src/stores/cart.ts`; island → `src/components/catalog/CartDrawer.svelte`;
  SSR card → `src/components/catalog/ProductCard.svelte`; types/config → `src/lib/`;
  page → `src/pages/catalog.astro`; tokens → `src/styles/tokens.css`; media →
  `public/images/products/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and the directories the feature needs

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0
- [x] T002 [P] Ensure directories exist: `src/stores/`, `src/components/catalog/` and `public/images/products/` (keep `.gitkeep` where empty)
- [x] T003 [P] Verify `@astrojs/svelte` integration is active in astro.config.mjs and `lucide-svelte` is in package.json dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Product types (with `stock`), cart store, config, tokens and media that MUST exist before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Extend src/lib/types/content.ts with the catalog data model (quote constraints from data-model.md): `Product` with `id` (REQUIRED, non-empty, unique), `name` (REQUIRED, non-empty), `priceCents` (integer, REQUIRED, ≥ 0), `image` (REQUIRED asset reference), `category` (enum `"Aftercare" | "Joyería" | "Insumos"`) and `stock` ("REQUIRED, integer ≥ 0 (units remaining) — added by clarification 2026-10-07"); export `PRODUCTS: Product[]` with concrete stock values (e.g. hoop-titanium 18, barbell-titanium 9, septum-horseshoe 4, aftercare-balm 12, aftercare-soap 6, piercing-solution 20 — low-stock example septum-horseshoe); `PaymentMethod` from PAY-01 (`pago_movil`/`binance_pay`/`efectivo`), `PAYMENT_METHODS` with labels (Pago Móvil default, Binance Pay, Efectivo)
- [x] T005 Create src/stores/cart.ts per `contracts/cart-contract.md` — `writable<CartItem[]>` + `derived` `itemCount` (sum of quantities) and `totalCents` (sum of `priceCents * quantity`, never float); `addToCart(product)` (increments when `product.id` exists — FR-002), `removeFromCart(productId)`, `updateQuantity(productId, delta)` ("resulting quantity ≤ 0 REMOVES the line"), `clearCart()`; `formatCents(cents)` via `Intl.NumberFormat` (USD, 2 decimals); `buildWhatsAppLink({ phone, items, paymentMethod })` returning `https://wa.me/{phone}?text={encodeURIComponent(message)}` with lines `- {quantity}x {name} ({price})`, `Total: {total}` and `Método de pago de preferencia: {method}`, `null` when `items` empty (FR-008) or `phone` is not digits-only
- [x] T006 [P] Create src/lib/config.ts exporting `WHATSAPP_PHONE` (digits-only studio number, placeholder value)
- [x] T007 [P] Add the missing token to src/styles/tokens.css: `--radius-image: 14px` (used by the ProductCard image container, 14px radius — Design Parity rule) before any component references it
- [x] T008 [P] Ensure placeholder product images exist in public/images/products/ (one SVG per `PRODUCTS.id`, dark/gold token palette, plus `placeholder.svg` for the `data-fallback` mechanism)

**Checkpoint**: Foundation ready — typed products (with `stock`), cart store, config, token and media complete

---

## Phase 3: User Story 1 - Browse Catalog & Add Products (Priority: P1) 🎯 MVP

**Goal**: Visitor sees every product (name, category, price, image, low-stock badge) on a
static grid, can filter by category (Aftercare, Joyería, Insumos, Todos), taps a card's add
button, and sees the floating cart count increment (single island, delegated events).

**Independent Test**: Open `/catalog` — grid renders statically (works with JS disabled);
selecting a category pill narrows the grid; tapping add increments the floating badge, and
re-adding increments quantity with no duplicate line (quickstart S1/S2/S4/S5).

### Implementation for User Story 1

- [x] T009 [US1] Create ProductCard.svelte in src/components/catalog/ProductCard.svelte — SSR-only presentational card: card tokens (`--bg-card-light`, `--border-card`, `--radius-card`, `--shadow-card`); image container `--bg-surface-elevated` (#242429) with `--radius-image` (14px) and `data-fallback`; category pill `--bg-badge-pill` (#202024); name + price bold with `tabular-nums` (`font-variant-numeric: tabular-nums`); low-stock badge `--accent-gold` (#E5A93C) rendered when `product.stock > 0 && product.stock <= 5`; add button `--accent-primary` (#E5A93C, `rounded-full`, ≥ 44px) carrying `data-add-to-cart={product.id}` and DISABLED/hidden when `product.stock === 0` (FR-011); markup is static (no `client:` directive used at the call site)
- [x] T010 [US1] Create CartDrawer.svelte in src/components/catalog/CartDrawer.svelte — the SINGLE `client:load` island: on mount attaches document-level delegated listeners for `[data-add-to-cart]` (→ `addToCart`) and `[data-category]` (→ toggle `.is-hidden` on grid items whose `data-category` doesn't match; default "all"); renders the FAB (circular `--accent-primary`, cart icon, item count badge from `itemCount`, hidden at 0, projected shadow `--shadow-glow`/`rgba(229, 169, 60, 0.25)`); FAB opens the drawer (open state lives here)
- [x] T011 [US1] Rework src/pages/catalog.astro — use `BaseLayout`; render a page title, category filter pills (Aftercare, Joyería, Insumos, Todos) with `data-category` + `aria-pressed` (default "all"); render the static responsive grid of `PRODUCTS` via `<ProductCard product={p} />` (SSR, no `client:`); mount `<CartDrawer client:load />` as the sole island; token-based, responsive grid (1–2 cols mobile → 4 desktop)

**Checkpoint**: At this point, User Story 1 is functional — static grid + filter + add-to-cart
with floating badge (MVP)

---

## Phase 4: User Story 2 - Manage the Floating Cart (Priority: P2)

**Goal**: Visitor opens the floating cart to review lines, adjust quantities, remove a line
or clear the cart; totals and item count update instantly and to the cent.

**Independent Test**: Open the drawer with ≥2 items; increment/decrement, remove one item,
clear all; confirm lines, item count and total always match to the cent (quickstart S3).

### Implementation for User Story 2

- [x] T012 [US2] Add the drawer body to CartDrawer.svelte in src/components/catalog/CartDrawer.svelte — drawer panel on charcoal surface (`--bg-card-light`) + dark translucent backdrop (only overlay): one line per `CartItem` (name, `formatCents` price, `＋/－` buttons calling `updateQuantity`, remove button calling `removeFromCart`), a "Vaciar carrito" action calling `clearCart()`, and a footer with `itemCount` + `totalCents` (formatted, `tabular-nums`) announced via `aria-live`; empty state with checkout disabled
- [x] T013 [US2] Wire drawer open/close in CartDrawer.svelte in src/components/catalog/CartDrawer.svelte — backdrop click and `Escape` close the drawer; focus moves into the drawer on open and returns to the FAB on close (non-modal dialog pattern); `role="dialog"` + accessible name on the panel

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Checkout via WhatsApp (Priority: P3)

**Goal**: Visitor picks a preferred payment method and opens WhatsApp with a pre-filled order
message (every line, total, method) addressed to the studio number.

**Independent Test**: With a non-empty cart, select each payment method and tap
"Enviar Pedido por WhatsApp" — the `wa.me` link contains every line, total and method; empty
cart → disabled, no link (quickstart S6).

### Implementation for User Story 3

- [x] T014 [US3] Add the payment-method selector to CartDrawer.svelte in src/components/catalog/CartDrawer.svelte — renders `PAYMENT_METHODS` (default `pago_movil` — "Pago Móvil") as selectable pills (`pago_movil`, `binance_pay`, `efectivo`)
- [x] T015 [US3] Add the checkout action to CartDrawer.svelte in src/components/catalog/CartDrawer.svelte — button labeled "Enviar Pedido por WhatsApp" (`--accent-primary`, `rounded-full`) builds the link with `buildWhatsAppLink({ phone: WHATSAPP_PHONE, items, paymentMethod })` and opens it in a new tab; button disabled when the cart is empty (FR-008)

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T016 [P] Accessibility pass: verify dialog a11y (Escape/backdrop/focus), `aria-pressed` on category pills, `aria-live` on totals/count, descriptive image `alt`, targets ≥ 44px, `tabular-nums` (quickstart S7)
- [x] T017 [P] Responsive pass: no horizontal scroll 320px–1920px; grid columns adapt; drawer usable on small screens (quickstart S1)
- [x] T018 [P] Performance pass: confirm ONLY `CartDrawer` hydrates (check dist/_astro bundles); grid remains SSR; sync cart ops; `category` filter toggles classes without re-rendering the grid (SC-001/002/004)
- [x] T019 Run final validation against quickstart.md scenarios S1–S7 plus `npx astro check` and `npm run build` at repository root — all MUST pass with zero errors; fix any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion; sequential in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational (T004/T005) — the `CartDrawer` island created here is extended by US2/US3
- **US2 (P2)**: After US1 — same island file, sequential; independently testable via S3
- **US3 (P3)**: After US2 — same island file, sequential; independently testable via S6
- **CROSS-CUTTING**: `CartDrawer.svelte` is built by T010 (US1) → T012/T013 (US2) → T014/T015 (US3) — MUST be strictly sequential, never parallel

### Within Each User Story

- Store + types (T004/T005) before components
- SSR card + island skeleton (US1) before drawer body (US2) before checkout (US3)
- `ProductCard.svelte` and `catalog.astro` are separate files from the island → parallel-safe with island work

### Parallel Opportunities

- Setup T002/T003, foundational T006/T007/T008, polish T016–T018 can run in parallel (different files)
- US1: T009 (ProductCard) and T010/T011 (island/page) are parallel-safe after foundational
- Do NOT parallelize tasks within `CartDrawer.svelte` (T010 → T012 → T013 → T014 → T015)

---

## Parallel Example: User Story 1

```bash
# Independent files, after foundational T004/T005:
Task: "Create ProductCard.svelte in src/components/catalog/ProductCard.svelte"   # T009
Task: "Rework catalog.astro with grid + pills + <CartDrawer client:load />"      # T011
Task: "Create CartDrawer.svelte island (FAB + delegation + badge)"               # T010
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (static grid + filter + add-to-cart + floating badge)
4. **STOP and VALIDATE**: quickstart S1/S2/S4/S5; `astro check` + `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready (store + products + config + token + media)
2. Add US1 → test S1/S2/S4/S5 → demo (MVP!)
3. Add US2 → test S3 → demo
4. Add US3 → test S6 → demo

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational: Developer A owns US1 (SSR card + page + island skeleton), then Developer B continues with US2/US3 on the same island file sequentially
3. Stories remain independently testable via quickstart S2/S3/S6

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Each user story is independently completable and testable (quickstart S2/S3/S6)
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Data-model constraints (`stock` REQUIRED ≥ 0; badge `0 < stock ≤ 5`; add disabled at `stock = 0`; quantity ≤ 0 removes the line; integer cents) are quoted verbatim and MUST NOT change at implementation time
- WhatsApp message template (contract §2) and button label "Enviar Pedido por WhatsApp" are binding
- `CartDrawer.svelte` is the ONLY hydrated island; never add a `client:` directive to ProductCard or the grid
- Commit after each task or logical group; stop at any checkpoint to validate the story independently