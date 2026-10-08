---

description: "Task list for Managed Service Catalog (Admin CRUD + Booking) feature implementation"
---

# Tasks: Managed Service Catalog (Admin CRUD + Booking)

**Input**: Design documents from `/specs/011-services-crud/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is done through the
`quickstart.md` scenarios S1–S11 plus the `npx astro check` (0 errors), `npm run build` and `npm run lint`
gates in the final polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of
each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro + Svelte)
- Types → `src/lib/types/domain.ts`; seed/types → `src/lib/data/services.ts`; adapters →
  `src/lib/data/adapters/`; generated Supabase types → `src/types/supabase.ts`; migration →
  `supabase/migrations/`; admin UI → `src/components/admin/`; booking UI →
  `src/components/booking/BookingFlow.svelte`
- **Token rule**: raw values only in `src/styles/tokens.css`; components consume `var(--token)`.
- **Money rule**: integer cents end-to-end; deposit = 50% of price.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and confirm the target files

- [ ] T001 Verify baseline: run `npx astro check` (MUST be 0 errors), `npm run build` and `npm run lint` at repository root; all MUST pass before changes
- [ ] T002 [P] Confirm target files and the next migration number: `src/lib/data/services.ts`, `src/lib/types/domain.ts`, `src/lib/data/adapters/{local,supabase}.ts`, `src/types/supabase.ts`, `src/components/booking/BookingFlow.svelte`, `src/components/admin/AdminPanel.svelte`, `src/components/admin/AdminCalendar.svelte`; latest migration is `0007_*.sql` → next is `0008`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain types, schema, generated types and adapter parity — MUST be complete before ANY user
story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Extend the service domain type/seed in `src/lib/data/services.ts`: add `active: boolean` to
  `PiercingService` and add `NewServiceInput { name; category; priceCents; durationMinutes; description; requiresDeposit }`; set `active: true` on every entry of the `PIERCING_SERVICES` seed (keep the fixed category union `"NOSTRIL" | "HELIX" | "NAVEL" | "TITANIO"`); then extend the `DataStore` interface in `src/lib/types/domain.ts` with `listServices(input?: { includeInactive?: boolean }): Promise<PiercingService[]>`, `createService(input: NewServiceInput): Promise<PiercingService>`, `updateService(id: string, patch: Partial<NewServiceInput> & { active?: boolean }): Promise<PiercingService>` (data-model.md, services-data-contract §1)
- [ ] T004 Add the `services` table to the generated types in `src/types/supabase.ts` (`Row`/`Insert`/`Update`/`Relationships`): `id text`, `name text`, `category text`, `description text`, `price_cents integer`, `duration_minutes integer`, `requires_deposit boolean`, `active boolean`, `created_at timestamptz` (Schema Control; services-data-contract §3)
- [ ] T005 [P] Add `supabase/migrations/0008_services.sql`: create `public.services` (id text PK; name not null; category check in `('NOSTRIL','HELIX','NAVEL','TITANIO')`; description not null default ''; `price_cents integer not null check (price_cents >= 0)`; `duration_minutes integer not null check (duration_minutes > 0)`; `requires_deposit boolean not null default true`; `active boolean not null default true`; `created_at timestamptz not null default now()`); enable RLS; policies: `select` public `using (active = true)`, `select` authenticated `using (true)`, `insert`/`update` authenticated; idempotent seed of the six current services with `on conflict (id) do nothing` (services-data-contract §3)
- [ ] T006 [P] Edit `src/lib/data/adapters/local.ts`: implement `listServices({ includeInactive })` (key `alpi:services:v1`, seeded with `PIERCING_SERVICES`, filter to `active` unless `includeInactive`), `createService` (generate a unique `id`, force `active: true`, validate name/category/price/duration, throw typed `DataError`), `updateService` (apply patch incl. `active`, validate, `DataError` if not found) (services-data-contract §2, research R2)
- [ ] T007 [P] Edit `src/lib/data/adapters/supabase.ts`: implement `listServices({ includeInactive })` against `public.services` (`.eq("active", true)` unless `includeInactive`), `createService` (insert with a generated `id` and `active: true`, `.select().single()`), `updateService` (update + `.select().single()`); narrow rows to `PiercingService` and map errors to typed `DataError` (depends on T004; services-data-contract §1/§2/§5)

**Checkpoint**: Types, schema, generated types and both adapters ready — user stories can begin

---

## Phase 3: User Story 1 - The operator manages the piercing service menu (Priority: P1) 🎯 MVP

**Goal**: A **Servicios** section in `/admin` lists all services and lets the operator create, edit and
activate/deactivate them (persisted), mirroring the Inventario patterns.

**Independent Test**: Sign in, open Servicios, create a service, edit its price/duration, deactivate it,
reload → the changes persisted and are reflected in admin (quickstart S3–S7).

> All tasks in this phase edit `src/components/admin/AdminPanel.svelte` — run sequentially, no `[P]`.

- [ ] T008 [US1] Add the **Servicios** section to the `src/components/admin/AdminPanel.svelte` sidebar:
  a third section button (lucide icon, active/hover treatment like the others), an `AdminSection` value
  `"services"` wired through `switchTab` and the `?tab=` query, and a list view that loads
  `dataStore.listServices({ includeInactive: true })` showing name, category, `formatCents(priceCents)`,
  `{durationMinutes} min` and the active state (with loading hint, empty state and `role="alert"` error)
  (admin-services-ui-contract §1/§2, FR-004)
- [ ] T009 [US1] Add the create/edit **service modal** in `src/components/admin/AdminPanel.svelte`:
  labeled controls (Nombre text required; Categoría select from `PIERCING_SERVICE_CATEGORIES`;
  Descripción textarea; Precio (centavos) number; Duración (min) number; Requiere seña checkbox default
  true), local validation (name non-empty, price integer ≥ 0, duration integer > 0) then
  `dataStore.createService(input)` / `dataStore.updateService(id, patch)`; on success close and reload, on
  failure show the `DataError` in `role="alert"` and keep the modal open; `role="dialog"` `aria-modal`
  with accessible name, Escape/backdrop close, focus management (admin-services-ui-contract §3/§4/§6/§7)
- [ ] T010 [US1] Add per-row **activate/deactivate** in `src/components/admin/AdminPanel.svelte`:
  a toggle (like the product `published` switch) calling
  `dataStore.updateService(id, { active: !active })`, disabling while in flight, then reloading the list
  (admin-services-ui-contract §5, FR-007)

**Checkpoint**: User Story 1 fully functional — manageable service menu (MVP)

---

## Phase 4: User Story 2 - The visitor books from the live service menu (Priority: P1)

**Goal**: `/booking` lists the managed active services (no hardcoded menu) and the booking flow uses their
price/duration; the admin calendar resolves durations from managed data too.

**Independent Test**: With managed services, open `/booking`, confirm the list matches (only active) and
selecting one shows the right price/deposit/duration; calendar blocks render with the right duration
(quickstart S1/S2).

- [ ] T011 [US2] Rework `src/components/booking/BookingFlow.svelte` to load services from
  `dataStore.listServices()` (active only) in `onMount` instead of the `PIERCING_SERVICES` constant: keep
  the same card markup/selection, add a polite loading hint (`aria-live`), resolve the `?service=<id>`
  deep link **after** the list loads, and derive summary/deposit/slot from the selected service
  (booking-menu-contract §1/§2, FR-002/FR-010)
- [ ] T012 [P] [US2] Update `src/components/admin/AdminCalendar.svelte` to stop using the
  `PIERCING_SERVICES` constant for durations: load `dataStore.listServices({ includeInactive: true })`
  once and build an `id → durationMinutes` map (fallback `30`) used by `durationFor` (research R6, FR-010)

**Checkpoint**: Booking menu and calendar reflect managed service data

---

## Phase 5: User Story 3 - The app keeps working in demo mode / on backend failure (Priority: P2)

**Goal**: If the backend is not configured or the services read fails, booking still shows a usable menu.

**Independent Test**: Run without backend config (or force a read error) → `/booking` shows the seed menu
and a non-blocking notice; demo admin edits persist across reloads (quickstart S8/S9).

- [ ] T013 [US3] In `src/components/booking/BookingFlow.svelte`, wrap the services load in a try/catch:
  on error fall back to the seed `PIERCING_SERVICES` filtered to `active === true` and show a
  non-blocking notice (e.g. "No se pudo cargar la lista en línea; mostrando el menú local.") instead of a
  blank list (booking-menu-contract §3, FR-011/FR-012, research R8)

**Checkpoint**: Public flow resilient to backend absence/failure

---

## Phase 6: User Story 4 - Only bookable services are offered publicly (Priority: P3)

**Goal**: Inactive services never appear in the public menu while remaining manageable in admin.

**Independent Test**: Deactivate a service → absent from `/booking` (with an elegant empty state when all
are inactive) but present/inactive in admin; reactivating restores it (quickstart S6/S10).

- [ ] T014 [US4] In `src/components/booking/BookingFlow.svelte`, ensure the public list excludes inactive
  services and add the elegant empty state "No hay servicios disponibles por el momento." when none are
  active (booking-menu-contract §1, FR-003)

**Checkpoint**: All four user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, audits and final validation

- [ ] T015 [P] Update `design-system.md` (document the **Servicios** admin section and the hybrid service
  source) and `README.md` (structure/notes: services CRUD, migration `0008`, demo fallback)
- [ ] T016 [P] a11y/responsive audit of the new admin UI and booking menu: labeled controls, `role="alert"`
  errors, `role="dialog"` modal with focus management, ≥44px targets, `prefers-reduced-motion`, no
  horizontal scroll 320–1920px (FR-015, SC-007)
- [ ] T017 [P] Token audit: grep `src/` for raw `#hex`/`rgba(` and confirm only `src/styles/tokens.css`
  contains literals (constitution §II)
- [ ] T018 Run the `quickstart.md` scenarios S1–S11 (public load/select, admin CRUD, deactivate, validation,
  demo persistence, fallback on failure, empty state, regressions)
- [ ] T019 Run `npx astro check` (MUST be **0 errors**), `npm run build` and `npm run lint` at repository
  root — all MUST pass (FR-016, SC-006, explicit user requirement)
- [ ] T020 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — edits `AdminPanel.svelte`
- **US2 (P1)**: After Foundational — edits `BookingFlow.svelte` and `AdminCalendar.svelte`
- **US3 (P2)**: After US2 (same `BookingFlow.svelte`, adds the fallback path)
- **US4 (P3)**: After US3 (same `BookingFlow.svelte`, adds the empty state/visibility guarantee)

### Within Each User Story

- Types (T003) before adapters (T006/T007)
- Generated types (T004) before the Supabase adapter (T007)
- Migration (T005) before production behavior is validated
- Admin list → modal → toggle are strictly sequential in the same file (T008 → T009 → T010)
- `BookingFlow` edits are strictly sequential (T011 → T013 → T014)

### Parallel Opportunities

- Setup: T002
- Foundational: T004, T005, T006, T007 in parallel (different files); T003 first
- US2: T012 (`AdminCalendar.svelte`) can run in parallel with T011 (`BookingFlow.svelte`)
- Polish: T015, T016, T017 in parallel (different concerns/files)
- Do NOT parallelize tasks editing the same file (`AdminPanel.svelte`, `BookingFlow.svelte`)

---

## Parallel Example: Foundational

```bash
# After T003:
Task: "Add services table types in src/types/supabase.ts"          # T004
Task: "Add supabase/migrations/0008_services.sql"                  # T005
Task: "Implement services CRUD in src/lib/data/adapters/local.ts"  # T006
Task: "Implement services CRUD in src/lib/data/adapters/supabase.ts" # T007
```

## Parallel Example: User Story 2

```bash
# Different files → can run in parallel:
Task: "Load active services in BookingFlow.svelte"        # T011
Task: "Resolve durations from services in AdminCalendar"  # T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (admin Servicios CRUD)
4. **STOP and VALIDATE**: quickstart S3–S7 + `npx astro check` / `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → types/schema/adapters ready
2. Add US1 → test S3–S7 → demo (MVP!)
3. Add US2 → test S1/S2 → demo
4. Add US3 → test S8/S9 → demo
5. Add US4 → test S6/S10 → demo
6. Polish → S11 + gates (T015–T020)

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (`AdminPanel.svelte`, T008 → T009 → T010)
   - Developer B: US2 (`BookingFlow.svelte` T011 then T013/T014; `AdminCalendar.svelte` T012)
3. Stories complete and integrate independently (validated via quickstart)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Contract constraints quoted verbatim and MUST NOT change at implementation time:
  - `category in ('NOSTRIL','HELIX','NAVEL','TITANIO')`; `price_cents >= 0`; `duration_minutes > 0`
  - `listServices()` returns **active only**; `listServices({ includeInactive: true })` returns all
  - Deposit = 50% of price; money integer cents
  - Fallback on read error: seed `PIERCING_SERVICES` filtered to `active`
- No Tailwind, no new `client:*` directives; components access data only via `dataStore`
- No changes to `bookings`/`products`/`time_blocks`; existing journeys MUST keep working (FR-016)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
