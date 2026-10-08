# ALPIERCING — Project Constitution & Architectural Rules

**Version:** 1.1.0
**Scope:** Global (architecture, data, code and UI governance)
**Status:** Binding — Supreme Architectural Authority
**Stack:** Astro · Svelte 5 · TypeScript · Canvas 2D · PocketBase

---

## Core Principles

### 1. Static-First & Islands of Interactivity
- **Rule:** The site MUST render as static/SSR HTML by default. JavaScript ships **only** inside Svelte islands, never as a full-page client app.
- **Islands budget:** every `client:*` directive MUST be justified:
  - `client:load` — only for above-the-fold interactive UI (cart, first booking step).
  - `client:visible` — for below-the-fold interactive UI (background canvas, slot picker).
  - `client:idle` — for non-critical enhancements.
- **Rationale:** the public experience (landing, catalog, booking) must stay fast on low-end mobile devices; Canvas runs exclusively in leaf islands.

### 2. Token-Driven Styling (Zero Tailwind)
- **Rule:** The single source of truth for visual style is [`src/styles/tokens.css`](./src/styles/tokens.css) — semantic CSS custom properties layered over Open Props.
- **Forbidden:** Tailwind (or any atomic utility framework) is **STRICTLY FORBIDDEN**.
- **No raw values in components:** colors, radii, shadows, spacing and typography MUST reference tokens. Raw hex literals are allowed **only** inside `tokens.css`.
- **Styling mechanism:** Astro/Svelte scoped `<style>` blocks.
- **Design authority:** every visual decision is governed by [`design-system.md`](./design-system.md) — see §1.2.

### 3. Type-Safe by Default
- **Rule:** TypeScript strict everywhere (`astro/tsconfigs/strict`). `any` is FORBIDDEN; use `unknown` plus explicit narrowing.
- **Domain typing:** every domain entity (`Appointment`, `Product`, `GalleryItem`, `PiercingService`, `Deposit`, …) has an explicit shared type under `src/lib/types/` (static data collections live under `src/lib/data/`).
- **Boundary validation:** external data (PocketBase responses, user input, WhatsApp payloads) is validated/narrowed before it enters the app.

### 4. Booking & Financial Integrity
- **Rule:** Monetary values (service quotes, deposits/señas, product prices) are stored and compared as **integer cents** — no floating-point money math.
- **Slot exclusivity:** a given date+time slot is exclusive. No two non-cancelled appointments may share the same slot.
- **Receipt validation:** an appointment becomes `CONFIRMED` **only** after the studio validates a deposit receipt (`comprobante`); pending deposits never block a slot.
- **No double counting:** deposited money is counted from validated, non-voided deposits only.
- **State transitions:** appointment status changes happen exclusively through the domain service functions (never ad-hoc in components).

### 5. Mobile-First, Accessible & Zero Overhead UX
- **Target user:** clients browsing and booking from mid/low-range phones.
- **Performance:** microinteractions MUST target 60fps; avoid layout thrash and long tasks on the main thread.
- **Accessibility:** semantic HTML, labeled controls, visible focus states, large tactile targets (min ~44px) and `prefers-reduced-motion` support.
- **Navigation depth:** at most 2–3 taps from a module root to complete the primary action (add to cart, book a slot).

---

## Stack Constraints

- **Framework:** Astro (output `static` / hybrid) with the `@astrojs/svelte` integration.
- **Interactivity:** Svelte 5 islands (runes: `$state`, `$derived`, `$props`, `$effect`).
- **Styling:** Scoped CSS + Open Props + `tokens.css`. No Tailwind (see Principle 2).
- **3D / Canvas:** Canvas 2D for decorative backgrounds (`InkBackgroundCanvas.svelte`); `three` + `@types/three` remain available for future 3D work.
- **Icons:** `lucide-svelte` (deprecated upstream; migration to `@lucide/svelte` tracked — do not introduce new icon libraries).
- **Data & Backend:** `pocketbase` (collections, records, file storage, admin auth). Native `fetch` is allowed only for read-only/public endpoints that need no persistence.
- **State Management:** Svelte stores for **ephemeral** UI state (cart). The booking flow is single-page local state (Svelte 5 runes). PocketBase is the ground truth for **domain** data.
- **Package manager:** `npm`.

---

## 1. Architecture & Project Structure Principles

### 1.1 Directory Structure
ALPIERCING is a public studio web app for **appointment scheduling, a product catalog and service booking** (perforaciones, joyería corporal y servicios relacionados). The **only** modules of the product are `landing`, `catalog`, `booking` and `admin` (governance §1.1), plus a framework-agnostic domain layer under `src/lib/`.

```text
al-piercing-web/
├── astro.config.mjs            # Astro config + [svelte()] integration
├── svelte.config.js            # Svelte preprocessors (vitePreprocess)
├── tsconfig.json               # extends astro/tsconfigs/strict
├── public/                     # Static assets (favicons, product/gallery images)
├── pb_migrations/              # PocketBase collections / migrations (planned)
├── src/
│   ├── components/             # Svelte islands + presentational components
│   │   ├── canvas/             # InkBackgroundCanvas.svelte (Canvas 2D background)
│   │   ├── catalog/            # ProductCard.svelte (SSR), CartDrawer.svelte (island)
│   │   ├── booking/            # BookingFlow.svelte (island)
│   │   └── ui/                 # AppHeader.astro
│   ├── layouts/                # Astro layouts (BaseLayout.astro)
│   ├── lib/                    # Domain layer (framework-agnostic)
│   │   ├── data/               # services.ts — fixed piercing service menu
│   │   ├── types/              # Shared domain types (content.ts)
│   │   └── utils/              # money.ts (integer cents), booking.ts (WhatsApp message)
│   ├── stores/                 # cart.ts (ephemeral UI state)
│   ├── styles/                 # tokens.css — single style source of truth
│   └── pages/                  # Astro routes
│       ├── index.astro         # /         → landing + servicios + galería
│       ├── catalog.astro       # /catalog  → joyería/aftercare + cart drawer
│       ├── booking.astro       # /booking  → servicio + slots + seña 50% (WhatsApp)
│       └── admin.astro         # /admin    → private studio panel
├── specs/                      # SDD feature specifications
└── .specify/                   # SDD tooling and memory
```

### 1.2 Design Reference (System Design)
Every UI/UX decision — color tokens, typography, cards, navigation, FAB behavior and visual components — MUST be governed by [`design-system.md`](./design-system.md) (System Design & UI Guidelines). That file is the binding source of truth for the app's appearance and visual behavior, and MUST be consulted as part of the design of any feature.

### 1.3 Documentation Hierarchy and Business Priority
Agents and all developers MUST follow this mandatory reading hierarchy in case of conflict:

1. **`constitution.md` (Supreme Architectural Authority):** project governance, module boundaries, data/persistence, financial integrity and the SDD flow.
2. **`design-system.md` (Supreme UI & Visual Authority):** tokens, layout, cards, navigation, FAB behavior (§1.2).
3. **`specs/<feature>/` (Local Specification):** applies business and technical guidance to each feature's tasks, following the Spec Kit templates (`spec.md`, `plan.md`, `tasks.md` and associated artifacts).

---

## 2. Code & TypeScript Standards

### 2.1 Language & Types
- TypeScript `strict` is mandatory; `astro check` must pass with zero errors.
- No `any`; no non-null assertions (`!`) on external data — narrow instead.
- Shared domain types live in `src/lib/types/` and are the contract between `src/lib` and the UI.

### 2.2 File & Naming Conventions
- Svelte islands: `PascalCase.svelte` (`ProductCard.svelte`).
- Astro layouts/pages: `PascalCase.astro` for layouts, lowercase route files (`catalog.astro`).
- Logic modules: `camelCase.ts` (`money.ts`, `bookingService.ts`).
- Stores: `camelCase.ts` exporting the store (`cart.ts` exports `cart`).

### 2.3 Component Rules
- Islands are **presentational + interaction only**; they MUST delegate data access to `src/lib/services`.
- Direct `fetch`/PocketBase calls inside `.svelte`/`.astro` components are FORBIDDEN.
- Svelte 5 runes for local component state; Svelte stores only for cross-island shared state (e.g. the cart badge and drawer).
- Every interactive control is keyboard-accessible and labeled.

### 2.4 Data & Persistence
- PocketBase collections are the ground truth for domain entities; Svelte stores/localStorage are for ephemeral UI state ONLY. Storing domain entities in client KV is FORBIDDEN.
- Collection/schema changes MUST be expressed as migrations under `pb_migrations/` and reflected in `src/lib/types/` **before** any UI is wired.
- Monetary fields are persisted as integer cents (e.g. `$10.50` → `1050`).

### 2.5 Styling
- Consume tokens via `var(--token)`; never hardcode brand values in components.
- Scoped `<style>` per component; global styles only in `src/styles/tokens.css`.

---

## SDD Workflow Rules

1. **Spec First:** no production code shall be generated or written without an explicit feature spec approved under `specs/`.
2. **Schema Control:** any change to domain collections requires a new PocketBase migration (`pb_migrations/`) and an updated shared type (`src/lib/types/`) before UI integration.
3. **Design Parity:** any new UI MUST use the design tokens and comply with `design-system.md`; new colors/radii require an update to `tokens.css` first.
4. **Island Justification:** every `client:*` directive must be justified against Principle 1 during review.
5. **Integrity Checks:** booking/financial features must state their slot-exclusivity and integer-cents behavior, and must not double-count deposits.
