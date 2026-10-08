# Implementation Plan: Product Catalog & Floating Cart

**Branch**: `002-catalog-cart` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-catalog-cart/spec.md` (incl. clarifications
2026-10-07: `stock` field + low-stock badge, and the single-island/4-file architecture).

## Summary

Build the catalog module with a **static SSR product grid** in `catalog.astro` and exactly
**one interactive Svelte island** (`CartDrawer`, `client:load`) that owns all client cart
state through `src/stores/cart.ts`. The island attaches delegated listeners over the static
grid (`data-add-to-cart`, `data-category`) for add-to-cart and category filtering, renders the
floating FAB + drawer, and produces the WhatsApp checkout message. Money is integer cents,
all styling uses design tokens, and no Tailwind is introduced.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5

**Primary Dependencies**: `@astrojs/svelte` (integration), `svelte/store` (cart store), `lucide-svelte` (cart icons), `open-props` + `tokens.css` (styling)

**Storage**: Client-side only — in-memory Svelte store (session-scoped). `localStorage` persistence deferred (see `research.md` §6).

**Testing**: `astro check` + `npm run build` gates; manual browser scenarios in `quickstart.md` (cart interactions, filter, WhatsApp link)

**Target Platform**: Modern evergreen browsers; mobile-first on mid-to-low-range devices

**Project Type**: Web application (static page + one interactive cart island)

**Performance Goals**: All cart operations synchronous and instant; the product grid is SSR
(no hydration per card); one hydrated island per page; no layout thrash

**Constraints**: Money as integer cents; token-only styling; the grid stays static (cards
server-rendered, zero client JS per card); delegated event wiring over `data-*` attributes;
drawer dialog a11y (focus, Escape, backdrop); `tabular-nums` figures; targets ≥ 44px;
**exactly four component/state files per clarification**: `cart.ts`, `ProductCard.svelte`,
`CartDrawer.svelte`, `catalog.astro`

**Scale/Scope**: Catalog page, cart store, floating FAB + drawer, WhatsApp checkout. Product
data is static content (now including `stock`). No admin or booking integration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands of Interactivity**: PASS. The product grid renders
  as static HTML (`ProductCard` server-rendered in `catalog.astro`, no `client:` directive).
  ONE island (`CartDrawer`, `client:load`) owns cart interactivity and attaches delegated
  listeners to `data-*` buttons in the static grid — justified as the sole interactive region.
- **Principle II — Token-Driven Styling**: PASS. All styles consume `tokens.css` variables.
- **Principle III — Type-Safe by Default**: PASS. `Product`/`CartItem`/store typed; no `any`;
  `data-*` selectors matched against typed constants.
- **Principle IV — Booking & Financial Integrity**: PASS (in scope). Integer cents end-to-end;
  totals exact to the cent; checkout is a WhatsApp deep link (no money movement yet).
- **Principle V — Mobile-First, Accessible**: PASS. Touch targets ≥ 44px, drawer dialog
  pattern, `tabular-nums`, no horizontal scroll 320–1920px.
- **SDD — Design Parity**: PASS. **Island Justification**: PASS (single `client:load` island;
  `research.md` §5).

No gate violations. **Complexity Tracking**: not applicable.

## Project Structure

### Documentation (this feature)

```text
specs/002-catalog-cart/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── catalog/
│   │   ├── CartDrawer.svelte       # SINGLE island (client:load): FAB, drawer, checkout, delegation
│   │   └── ProductCard.svelte      # SSR presentational card (rendered statically by catalog.astro)
│   └── ui/                         # existing shared UI (unchanged)
├── lib/
│   ├── config.ts                   # WHATSAPP_PHONE (digits-only placeholder)
│   └── types/
│       └── content.ts              # + Product (with stock), PRODUCTS, PaymentMethod, PAYMENT_METHODS
├── pages/
│   └── catalog.astro               # static grid + category pills + <CartDrawer client:load />
└── stores/
    └── cart.ts                     # cart store + WhatsApp message builder
```

**Structure Decision**: Re-aligned with clarification Q2. The earlier `CatalogPage` root
island and separate `FloatingFab` are **superseded**: the interactive surface is a single
`CartDrawer` island; `ProductCard` is SSR-only; grid/filter/add wiring uses `data-*`
attributes + event delegation from the island. Exactly the four clarified files handle the
feature's logic/UI. Static content/types stay in `src/lib/types/content.ts` (constitution §1.1).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no constitution violations.

**Post-Design Re-check (after Phase 1)**: PASS — see `research.md`, `data-model.md` and
`contracts/cart-contract.md`; the single-island delegation design, `stock` field and
token-only ProductCard visual rules were verified against all five principles.