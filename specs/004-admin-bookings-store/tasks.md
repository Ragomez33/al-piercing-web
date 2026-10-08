---

description: "Task list for Admin Dashboard, Bookings & Hybrid Data Layer feature implementation"
---

# Tasks: Admin Dashboard, Bookings & Hybrid Data Layer

**Input**: Design documents from `/specs/004-admin-bookings-store/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is done
through `quickstart.md` scenarios S1–S10 plus `astro check` / `npm run build` gates (final polish
phase).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro project)
- Data layer → `src/lib/data/` + `src/lib/data/adapters/`; types → `src/lib/types/`;
  utils → `src/lib/utils/`; islands → `src/components/{admin,booking,catalog}/`;
  pages → `src/pages/`; migration → `supabase/migrations/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline, add directories and the production SDK dependency

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0
- [x] T002 [P] Ensure directories exist: `src/components/admin/`, `src/lib/data/adapters/`, `supabase/migrations/`
- [x] T003 Install `@supabase/supabase-js` as a dependency (used ONLY by the production adapter in src/lib/data/adapters/supabase.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The unified hybrid data layer (types, config, dates, adapters, facade, migration) that
MUST exist before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create src/lib/types/domain.ts — domain types per `contracts/data-layer-contract.md` §1 and `data-model.md`: `BookingStatus` (`"PENDING" | "CONFIRMED" | "CANCELLED"`), `DataMode` (`"demo" | "production"`), `Booking` (`id` REQUIRED unique; `createdAt` ISO; `clientName` REQUIRED ≥ 2 chars after trim; `clientWhatsapp` REQUIRED ≥ 7 chars after trim; `serviceId` REQUIRED; `serviceName` REQUIRED non-empty; `priceCents` integer ≥ 0; `depositCents` = `Math.round(priceCents / 2)`; `date` local ISO `yyyy-mm-dd` ≥ today; `timeSlot` `HH:mm` within agenda; `status`; `notes` optional), `ProductRecord` (`id`; `name` REQUIRED non-empty; `category` ProductCategory; `priceCents` ≥ 0; `stock` ≥ 0; `image`; `published` boolean — `false` hides from public catalog), and the `NewBookingInput` / `NewProductInput` helper types
- [x] T005 [P] Extend src/lib/config.ts per contract §4 — `WHATSAPP_PHONE = import.meta.env.PUBLIC_WHATSAPP_PHONE ?? "5215500000000"`; `ADMIN_PIN = import.meta.env.PUBLIC_ADMIN_PIN ?? "1234"`; `PAYMENT_PAGO_MOVIL` and `PAYMENT_BINANCE_PAY` entries (label + env-overridable placeholder ref)
- [x] T006 [P] Create src/lib/utils/dates.ts — local-ISO "today" helper (device timezone, no UTC off-by-one) + agenda builder (slots 11:00–19:30 in 30-min steps, `HH:mm`), per research §11
- [x] T007 Create src/lib/data/adapters/local.ts — demo adapter per contract §3: versioned keys `alpi:bookings:v1` / `alpi:products:v1`; first read seeds `PIERCING_SERVICES`/`PRODUCTS`; writes replace the full array; reads narrow through `isBooking`/`isProductRecord` (corrupt entries dropped, never trusted); failures thrown as typed `DataError`
- [x] T008 Create src/lib/data/adapters/supabase.ts — production adapter per contract §3: anon client from `import.meta.env.PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY`; maps `bookings` and `products` rows to domain types; throws typed `DataError` on failure (no false-success writes)
- [x] T009 Create src/lib/data/store.ts — `DataStore` facade singleton exposing `mode`, `listServices`, `listProducts({includeUnpublished})`, `createProduct`, `updateProduct(id, patch)`, `listBookings({date?})`, `createBooking`, `updateBookingStatus(id, status)`, `getBookedSlots(date)`; selects the Supabase adapter when BOTH `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are present, otherwise `local` (FR-001/FR-002)
- [x] T010 [P] Create supabase/migrations/0001_init.sql — `bookings` (id, created_at, client_name, client_whatsapp, service_id, service_name, price_cents, deposit_cents, date, time_slot, status, notes) and `products` (id, name, category, price_cents, stock, image, published)

**Checkpoint**: Foundation ready — data layer, adapters, config and migration complete

---

## Phase 3: User Story 1 - Studio owner manages bookings (Priority: P1) 🎯 MVP

**Goal**: The owner unlocks `/admin` with a PIN and manages the daily agenda — list bookings with
client/service/date-time/status/deposit, confirm or cancel them, and filter by date.

**Independent Test**: Unlock the panel, verify each booking row shows client, service, date/time,
status badge and deposit; use `[Confirmar Cita]` and `[Cancelar]`; filter by a date and confirm only
that day's bookings appear (quickstart S5/S6).

### Implementation for User Story 1

- [x] T011 [P] [US1] Create src/components/admin/AdminPanel.svelte — the `client:load` island: PIN gate (compare `ADMIN_PIN`, persist `alpi:admin:unlocked` in `sessionStorage`, "Bloquear" relocks, no data rendered while locked) + tab shell (read/update `?tab=`, default `bookings`)
- [x] T012 [US1] Implement the bookings tab in src/components/admin/AdminPanel.svelte — rows (client name+whatsapp, serviceName, date, timeSlot, status badge via `--accent-gold/positive/negative`, deposit via `formatCents`); `[Confirmar Cita]` → `dataStore.updateBookingStatus(id, "CONFIRMED")` ONLY when `PENDING`; `[Cancelar]` → `"CANCELLED"`; `<input type="date">` filter → `dataStore.listBookings({ date })` (FR-011/012/013)
- [x] T013 [P] [US1] Rework src/pages/admin.astro — host `<AdminPanel client:load />` inside `BaseLayout` (title "Panel — ALPIERCING"), forwarding the initial `tab` from the query string
- [x] T014 [US1] Add empty/error/loading states + a11y to the bookings tab in src/components/admin/AdminPanel.svelte (labels, `aria-live`, visible focus, targets ≥ 44px)

**Checkpoint**: At this point, User Story 1 is fully functional — PIN-gated agenda management (MVP)

---

## Phase 4: User Story 2 - Client books an available slot & confirms via WhatsApp (Priority: P2)

**Goal**: The client sees genuinely busy slots blocked for the chosen date, and confirming persists
the booking (PENDING) and opens WhatsApp with the deposit + payment details.

**Independent Test**: Book a slot, then reopen the same date and verify that slot is disabled;
confirm a booking and verify persistence + the WhatsApp summary with 50% seña and Pago Móvil/Binance
Pay (quickstart S3/S4).

### Implementation for User Story 2

- [x] T015 [US2] Extend src/components/booking/BookingFlow.svelte — on date change call `dataStore.getBookedSlots(date)` and disable those slots, replacing the deterministic-hash placeholder availability (FR-004)
- [x] T016 [US2] Persist the booking in src/components/booking/BookingFlow.svelte — on confirm call `dataStore.createBooking(...)` (status `PENDING`) BEFORE opening WhatsApp; destination number from `WHATSAPP_PHONE` (env-overridable) (FR-006/FR-009)
- [x] T017 [US2] Add the deposit payment summary to the confirmation block in src/components/booking/BookingFlow.svelte — 50% seña (`calcDepositCents`) + `PAYMENT_PAGO_MOVIL` / `PAYMENT_BINANCE_PAY` from config (FR-008)
- [x] T018 [US2] Handle `DataError` gracefully in src/components/booking/BookingFlow.svelte — inline error, never open a broken WhatsApp link

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Studio owner manages catalog & inventory (Priority: P3)

**Goal**: The owner edits stock inline, publishes/hides products and adds new ones from the catalog
tab; the public catalog reflects only published products.

**Independent Test**: Edit a stock inline, toggle publish off and verify the product vanishes from
the public catalog, and add a new product that appears in both views (quickstart S7/S8).

### Implementation for User Story 3

- [x] T019 [P] [US3] Implement the catalog tab in src/components/admin/AdminPanel.svelte — rows (image, name, category, price, stock, published); inline stock number input + save → `dataStore.updateProduct(id, { stock })`; publish toggle → `dataStore.updateProduct(id, { published })` with `aria-pressed`; unpublished rows dimmed with "Oculto" chip (FR-014/015/016)
- [x] T020 [US3] Add the add-product modal (dialog) in src/components/admin/AdminPanel.svelte — fields Nombre, Categoría (the three catalog categories), Precio en centavos, Stock, Imagen (reference/URL, fallback `/images/products/placeholder.svg`); validation: name non-empty, valid category, `priceCents ≥ 0`, `stock ≥ 0`; submit → `dataStore.createProduct` (FR-017)
- [x] T021 [P] [US3] Create src/components/catalog/CatalogGrid.svelte — `client:load` island: SSR fallback renders static `PRODUCTS`; on mount loads `dataStore.listProducts({ includeUnpublished: false })` and renders a `ProductCard` per record (FR-016)
- [x] T022 [US3] Rework src/pages/catalog.astro — host `<CatalogGrid client:load />` and keep `<CartDrawer client:load />`; unpublished products never render
- [x] T023 [US3] a11y + Dark Premium pass for catalog tab and modal in src/components/admin/AdminPanel.svelte (tokens only, labels, focus trap, `Escape` close, targets ≥ 44px)

**Checkpoint**: All user stories are independently functional

---

## Phase 6: User Story 4 - The app works with or without a live backend (Priority: P4)

**Goal**: Every module consumes the data layer, demo mode persists/survives reloads, and production
failures surface without false successes.

**Independent Test**: Run with no backend config (demo): book + stock-edit persist across reloads;
with config present the same flows hit the live backend (quickstart S1/S2).

### Implementation for User Story 4

- [x] T024 [P] [US4] Switch product lookups in src/components/catalog/CartDrawer.svelte to `dataStore.listProducts({ includeUnpublished: false })` for add-to-cart matching (FR-003)
- [x] T025 [US4] Render the landing service menu through `dataStore.listServices()` in src/pages/index.astro (FR-003)
- [x] T026 [US4] Surface production-mode `DataError` failures with inline handling in AdminPanel, BookingFlow and CatalogGrid — no false-success writes (quickstart edge: backend unreachable)
- [x] T027 [US4] Verify demo-mode seed + persistence integrity: reloads keep bookings/products; corrupt `alpi:*` entries are dropped by the narrowers (quickstart S1/S3)

**Checkpoint**: Hybrid operation works end-to-end in both modes

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T028 [P] a11y/responsive pass across admin and CatalogGrid — no horizontal scroll 320–1920px, targets ≥ 44px, visible focus, reduced-motion untouched (quickstart S10)
- [x] T029 [P] Token pass — grep `src/` for raw hex/rgba: only `src/styles/tokens.css` may contain literals (quickstart S10)
- [x] T030 [P] Performance/island audit — only `AdminPanel`, `CatalogGrid`, `BookingFlow`, `CartDrawer` and the canvas hydrate (principle I)
- [x] T031 [P] Update docs — `design-system.md` admin module + `README.md` modules table to describe the data layer, PIN gate and tabs
- [x] T032 Run final validation against quickstart.md S1–S10 plus `npx astro check` and `npm run build` at repository root — all MUST pass with zero errors and zero warnings (FR-020/SC-007)
- [ ] T033 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational; implement in priority order
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — PIN gate + bookings tab (AdminPanel file)
- **US2 (P2)**: After Foundational — extends BookingFlow.svelte (separate file)
- **US3 (P3)**: After Foundational — AdminPanel catalog tab + CatalogGrid + catalog.astro
- **US4 (P4)**: After Foundational — touches CartDrawer.svelte, index.astro and error surfaces from US2/US3 (softer coupling; still independently verifiable via demo-mode scenarios)

### Within Each User Story

- Data-layer/wiring tasks before UI polish within the story
- `AdminPanel.svelte` is shared by US1 (T012) and US3 (T019/T020/T023) — those tasks MUST run
  sequentially within their phases, never in parallel

### Parallel Opportunities

- Setup T002/T003; Foundational T005/T006/T010; US1 T013; US3 T019/T021; US4 T024;
  Polish T028–T031 can run in parallel (different files)
- T011 (US1 shell) and T013 (admin.astro) are parallel-safe after Foundational

---

## Parallel Example: Foundational + User Story 1

```bash
# After Phase 1:
Task: "Create src/lib/types/domain.ts"                        # T004
Task: "Extend src/lib/config.ts"                              # T005
Task: "Create src/lib/utils/dates.ts"                         # T006
Task: "Create src/lib/data/store.ts"                          # T009
Task: "Create src/components/admin/AdminPanel.svelte (PIN)"   # T011
Task: "Rework src/pages/admin.astro"                          # T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (PIN gate + bookings tab)
4. **STOP and VALIDATE**: quickstart S5/S6; `astro check` + `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → data layer ready (demo + production adapters)
2. Add US1 → test S5/S6 → demo (MVP!)
3. Add US2 → test S3/S4 → demo
4. Add US3 → test S7/S8 → demo
5. Add US4 → test S1/S2 → demo (hybrid verified)
6. Polish → S10 + gates

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: Developer A owns US1 then US3 (shared AdminPanel file);
   Developer B owns US2 (BookingFlow); Developer C owns US4 wiring + polish
3. Stories remain independently testable via quickstart S3–S8

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Each user story is independently completable and testable (quickstart S1–S8)
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Data-model constraints (slot exclusivity for `PENDING`/`CONFIRMED`, deposit = `round(price_cents/2)`,
  integer cents, `published: false` hides from catalog) are quoted verbatim and MUST NOT change at
  implementation time
- `AdminPanel.svelte` is the ONLY new admin island; `CatalogGrid.svelte` is the ONLY new catalog
  island — never add `client:` to ProductCard or the static landing
- Direct `supabase`/`fetch` calls are FORBIDDEN outside `src/lib/data/adapters/`
- Commit after each task or logical group; stop at any checkpoint to validate the story independently