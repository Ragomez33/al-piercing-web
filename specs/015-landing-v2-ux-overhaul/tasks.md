---
description: "Task list for Landing V2 UX Overhaul, Copy Alignment & Admin Loading States"
---

# Tasks: Landing V2 UX Overhaul, Copy Alignment & Admin Loading States

**Input**: Design documents from `specs/015-landing-v2-ux-overhaul/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT included. The project has no unit-test runner and the specification did not request a TDD approach. Verification is done via `npx astro check`, `npm run build`, `npm run lint`, and the manual scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Every task includes an exact file path

## Path Conventions

Single project: `src/` at repository root (Astro pages + Svelte islands), per `plan.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working baseline before edits; no dependencies are added.

- [X] T001 Confirm branch `015-landing-v2-ux-overhaul` is checked out with no new dependencies needed, and capture the pre-change baseline by running `npm run check` and `npm run build` at the repository root; record any pre-existing errors to distinguish them from regressions.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared static content and the hours helper that multiple user stories consume.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Update `src/lib/types/content.ts`: add `StudioRating { value: number; count: number }` and `Review { id: string; author: string; text: string; rating?: number }` and `BookingPolicy { title: string; body: string }`; add constants `STUDIO_RATING` (value 0–5, integer count ≥ 0), `STUDIO_REVIEWS: Review[]` (2–4 curated entries, ids unique), and `BOOKING_POLICY`; set `STUDIO_PROFILE.location = "El Tigre, Anzoátegui"`; change `PROCESS_STEPS[1].title` to `"Reserva con Adelanto (50%)"` and its description to use "el 50% del adelanto" (per `contracts/copy-config-contract.md`).
- [X] T003 [P] Create `src/lib/utils/hours.ts` with the `Weekday` union, `StructuredHours` type (`Record<Weekday, { open: string; close: string } | null>` using `HH:mm`), the default schedule Mo–Sa 11:00–20:00, and a pure `getOpenStatus(hours, now)` returning `{ open: boolean; label: string; nextChange: string }` producing `"Abierto • Cierra a las HH:MM"` / `"Cerrado • Abre a las HH:MM"`; treat invalid/missing days as closed (per `contracts/landing-v2-ui-contract.md` §4).

**Checkpoint**: Shared content types and the hours helper are ready.

---

## Phase 3: User Story 1 - Browse the studio and book from a single continuous page (Priority: P1) 🎯 MVP

**Goal**: `/landing-v2` becomes a single continuous page with an anchor top-bar, a two-column desktop layout and a sticky summary card, replacing the tab island.

**Independent Test**: Open `/landing-v2` on desktop — confirm continuous sections (policy → Servicios → Equipo → Acerca de → Galería → Dirección) with no tabs, a sticky right card showing `Abierto • Cierra a las HH:MM`, `El Tigre, Anzoátegui`, rating/reviews and a "Reservar mi cita" button, and no Instagram/WhatsApp in the card; use each anchor link; start a booking from a service; collapse to mobile at 320px with no horizontal scroll.

### Implementation for User Story 1

- [X] T004 [US1] Rewrite `src/pages/landing-v2.astro` as the static continuous shell: anchor top-bar (`#servicios`, `#equipo`, `#acerca-de`, `#galeria`, `#resenas`, `#direccion`), booking-policy banner (`BOOKING_POLICY`), About (`STUDIO_PROFILE.bio`), Gallery (`GALLERY_ITEMS`), Address/Contact (address, hours, and the site's Instagram/WhatsApp moved out of the card); two-column grid (`minmax(0,1fr)` + `340px`, `align-items: start`, sticky right column ≥768px); mount `LandingV2Services` (`client:load`), `TeamSection` (`client:visible`) and `LandingV2Sidebar` (`client:load`); add `:global(html) { scroll-behavior: smooth }` with a `prefers-reduced-motion` reset; remove all `?tab=` logic.
- [X] T005 [P] [US1] Create `src/components/landing/LandingV2Services.svelte` (`client:load`): grouped collapsible list from `dataStore.listServices()` with the `listFallbackServices()` fallback, only active services, rows showing duration/price and a "Requiere adelanto" badge when `requiresDeposit`, a `/booking?service=<id>` action, plus loading/empty/non-blocking-notice states; keyboard-operable (`<details>/<summary>` or button + `aria-expanded`); tokens only, ≥44px targets (per `contracts/landing-v2-ui-contract.md` §5).
- [X] T006 [P] [US1] Create `src/components/landing/LandingV2Sidebar.svelte` (`client:load`): avatar (`BRAND_LOGO`), live status via `getOpenStatus` ("Abierto • Cierra a las HH:MM"), address "El Tigre, Anzoátegui", rating/reviews block with `id="resenas"` (`STUDIO_RATING` + `STUDIO_REVIEWS`), and a prominent "Reservar mi cita" link to `/booking`; contain NO Instagram/WhatsApp actions (per `contracts/landing-v2-ui-contract.md` §4).
- [X] T007 [P] [US1] Delete `src/components/landing/LandingV2Tabs.svelte` and remove every remaining reference to it.
- [X] T008 [US1] Responsive, anchor and accessibility pass over `src/pages/landing-v2.astro` and the two new islands: single-column <768px, sticky card ≥768px, no horizontal scroll at 320–1920px, ≥44×44px controls, visible focus, semantic headings/landmarks, lazy images with placeholder fallback, reduced-motion honored.

**Checkpoint**: User Story 1 is fully functional and testable on `/landing-v2`.

---

## Phase 4: User Story 2 - Consistent, trustworthy copy about payment, location and booking (Priority: P1)

**Goal**: Every user-facing surface uses the corrected vocabulary and location.

**Independent Test**: Search the repo for `Seña`, `seña`, `CDMX`, `Ciudad de México`, `Reservar mi turno`, `Reservar Turno` — no user-facing matches remain; the booking flow refers to "Adelanto"/"Apartado"; location reads "El Tigre, Anzoátegui"; primary CTAs read "Reservar mi cita".

### Implementation for User Story 2

- [X] T009 [P] [US2] Update `src/lib/config.ts`: `BUSINESS_ADDRESS` defaults to `addressLocality: "El Tigre"`, `addressRegion: "Anzoátegui"`, `addressCountry: "VE"` (keep `PUBLIC_BUSINESS_*` overrides) per `contracts/copy-config-contract.md`.
- [X] T010 [P] [US2] Update `src/pages/index.astro`: meta description "…en El Tigre, Anzoátegui…"; hero CTA `"Reservar Turno (50% Seña)"` → `"Reservar mi cita"`; service row `"Requiere seña"` → `"Requiere adelanto"`; `"Reservar mi turno"` → `"Reservar mi cita"`.
- [X] T011 [P] [US2] Update `src/pages/booking.astro`: title/heading `"Reservar Turno"` → `"Reservar mi cita"`; description and hero paragraph `"seña del 50%"` → `"adelanto del 50%"`.
- [X] T012 [P] [US2] Update `src/components/booking/BookingFlow.svelte`: `"Requiere seña"` → `"Requiere adelanto"`; `"Seña a abonar (50%)"` → `"Adelanto a abonar (50%)"`; `"Datos para abonar la seña"` → `"Datos para abonar el adelanto"`; `"Solicitar turno"` → `"Solicitar cita"`.
- [X] T013 [P] [US2] Update `src/lib/utils/booking.ts`: WhatsApp confirmation copy `"Confirmamos tu turno"` → `"Confirmamos tu cita"`.
- [X] T014 [P] [US2] Update `src/components/admin/AdminCalendar.svelte`: `"Seña (50%)"` → `"Adelanto (50%)"`.
- [X] T015 [US2] Repository-wide copy sweep under `src/`: search for `Seña`, `seña`, `CDMX`, `Ciudad de México`, `Reservar mi turno`, `Reservar Turno`, and user-facing `turno`; fix any stragglers outside `specs/` (the `AdminPanel.svelte` "Requiere seña" is handled in T020).

**Checkpoint**: Copy and configuration are consistent across the whole site.

---

## Phase 5: User Story 3 - See studio changes reflected live without reloading (Priority: P2)

**Goal**: An open `/landing-v2` reflects service/team changes without a manual reload.

**Independent Test**: With `/landing-v2` open, change a service and a team member through the admin — the page updates within ~5s without reload and without a scroll jump; with the transport unavailable, the last known content remains and the focus fallback refetches.

### Implementation for User Story 3

- [X] T016 [P] [US3] Create `src/lib/data/realtime.ts`: `DataResource = "services" | "team" | "products"`, `DataChangeEvent { resource; origin; at }`, `publishDataChange(resource)`, and `subscribeToDataChanges(resources, listener): () => void` (never throws); implement the demo transport (`BroadcastChannel("alpi:data")` + `window` `storage` fallback), the production transport (Supabase Realtime `postgres_changes` on `services`/`team_members` via the shared client), and the `visibilitychange`/`focus` refetch fallback (per `contracts/data-sync-contract.md`).
- [X] T017 [US3] Update `src/lib/data/store.ts`: wrap the object returned by `createDataStore()` so successful `create*/update*/delete*` for services/team/products call `publishDataChange(resource)` (throwing mutations emit nothing); keep the `DataStore` return type and add no new schema.
- [X] T018 [US3] Update `src/components/landing/LandingV2Services.svelte`: subscribe with `subscribeToDataChanges(["services"], …)` on mount, debounce bursts, re-fetch via `dataStore.listServices()` and patch state in place (no teardown/scroll jump), and unsubscribe on destroy (depends on T005, T016, T017).
- [X] T019 [US3] Update `src/components/team/TeamSection.svelte`: subscribe with `subscribeToDataChanges(["team"], …)`, patch in place, keep the existing fallback/empty states, and unsubscribe on destroy (depends on T016, T017).

**Checkpoint**: Live synchronization works on both landings.

---

## Phase 6: User Story 4 - Manage the catalog and services without flicker (Priority: P2)

**Goal**: Admin mutations never blank/flash the list; per-row busy states and inline errors replace full-list reloads.

**Independent Test**: In `/admin`, delete a service and edit another — the list never blanks and the affected row shows an inline busy state; a forced failure keeps the row and shows an error; rapid multiple deletions leave the list stable.

### Implementation for User Story 4

- [X] T020 [US4] Refactor the services list in `src/components/admin/AdminPanel.svelte`: add a `servicesLoaded` guard so the "Cargando…" placeholder only renders before the first successful load; replace the `await refreshServices()` calls in `submitService()` and `toggleServiceActive()` with in-place patching from the returned record; in `confirmDeleteService()` remove the item by id after the promise resolves; keep per-row `svBusy` and inline `servicesError`; also change `"Requiere seña"` → `"Requiere adelanto"` (per `contracts/admin-list-state-contract.md`).
- [X] T021 [US4] Refactor the catalog list in `src/components/admin/AdminPanel.svelte`: add a `productsLoaded` guard; in `saveStock()`/`togglePublished()` patch the item from the returned record (clear `stockDraft[id]` after success); in `submitCreate()` append the returned record; stop calling `refreshCatalog()` after mutations; keep per-row `saving` and inline `productsError`.
- [X] T022 [US4] Refactor the team list in `src/components/admin/AdminPanel.svelte`: add a `teamLoaded` guard; in `submitTeamMember()`/`toggleTeamActive()` patch from the returned record; in `confirmDeleteTeamMember()` remove by id after resolution; stop calling `refreshTeam()` after mutations; keep per-row `tmBusy`/`deletingTeamBusy` and inline `teamError`.
- [X] T023 [US4] Add token-styled inline busy/skeleton affordances for pending admin rows in `src/components/admin/AdminPanel.svelte` (short skeleton or spinner, disabled controls, `aria-busy`), suppressed under `prefers-reduced-motion`; ensure no list-wide `loading` flag flips on a mutation.
- [X] T024 [US4] Validate no-flicker behavior in `src/components/admin/AdminPanel.svelte`: rapid successive deletes produce no duplicated/missing rows; a failed delete/edit preserves prior data and shows the inline error; the list stays mounted throughout.

**Checkpoint**: Admin lists are stable with no flicker and recover gracefully from errors.

---

## Phase 7: User Story 5 - Team parity on the first landing page (Priority: P3)

**Goal**: The original landing shows the same team/artists section.

**Independent Test**: Open `/` and confirm the "Nuestro Equipo" section renders active members with name/role (or the elegant empty state), consistent with `/landing-v2#equipo`.

### Implementation for User Story 5

- [X] T025 [US5] Verify and keep `<TeamSection client:visible />` mounted in `src/pages/index.astro` (already present at line 116); confirm it renders active members or the empty state and needs no change beyond the additive subscription from T019.

**Checkpoint**: Both landings present the team section from the same data source.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and end-to-end validation across all stories.

- [X] T026 [P] Update `design-system.md` to document the continuous landing layout, the sticky summary card and the live data-change subscription.
- [X] T027 [P] Update `README.md` to describe the revised `/landing-v2` (continuous Setmore-style profile).
- [X] T028 Run `npx astro check` (MUST pass with 0 errors and no type discrepancies), `npm run build` and `npm run lint`; fix any issues the new/changed files introduce.
- [X] T029 Automated validation passed: build + rendered-HTML checks (anchors, sticky card, copy, JSON-LD) plus `npx astro check` / `npm run build` / `npm run lint`. Interactive browser scenarios (admin CRUD flicker, cross-tab live sync, reduced-motion) remain for the manual pass in `quickstart.md` — see completion notes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phases 3–7)**: Depend on Foundational. US1 and US2 are independent of each other; US3 depends on US1; US5 is verification-only.
- **Polish (Phase 8)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories. Delivers the MVP.
- **US2 (P1)**: After Foundational. Independent of US1 (different files; `content.ts` and `config.ts` are handled in Foundational/US2 with no overlap on other story files).
- **US3 (P2)**: After Foundational **and US1** (subscribes inside `LandingV2Services.svelte`); T016/T017 are shared by both subscriptions.
- **US4 (P2)**: After Foundational. Independent (only `AdminPanel.svelte`).
- **US5 (P3)**: After Foundational; verifies `index.astro` and benefits from T019.

### Within Each User Story

- Foundational content/types before any consumer.
- US1 shell before its islands are mounted; islands before validation.
- US3 data-layer pub/sub (T016, T017) before island subscriptions (T018, T019).
- US4 guard + patching before the no-flicker validation.
- Story complete before moving to the next priority (or run US1/US2/US4 in parallel).

### Parallel Opportunities

- Setup: single task.
- Foundational: T002 and T003 are different files → run in parallel.
- US1: T005, T006 and T007 are different files → parallel; T004 integrates them; T008 validates.
- US2: T009–T014 are all different files → parallel; T015 is the sweep.
- US3: T016 and T017 are different files → parallel; T018 depends on US1's T005.
- US4: T020–T023 all edit `AdminPanel.svelte` → sequential (no `[P]`).
- Polish: T026 and T027 are different files → parallel.

---

## Parallel Example: User Story 1

```bash
# Build the two column islands and drop the tab island together (different files):
Task: "Create src/components/landing/LandingV2Services.svelte (T005)"
Task: "Create src/components/landing/LandingV2Sidebar.svelte (T006)"
Task: "Delete src/components/landing/LandingV2Tabs.svelte (T007)"
```

## Parallel Example: User Story 2

```bash
# All copy surfaces are separate files:
Task: "Update src/lib/config.ts (T009)"
Task: "Update src/pages/index.astro (T010)"
Task: "Update src/pages/booking.astro (T011)"
Task: "Update src/components/booking/BookingFlow.svelte (T012)"
Task: "Update src/lib/utils/booking.ts (T013)"
Task: "Update src/components/admin/AdminCalendar.svelte (T014)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) — the continuous landing.
3. **STOP and VALIDATE**: run `quickstart.md` scenarios 1–3 and 8.
4. Demo the reworked `/landing-v2` (MVP).

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add US1 → validate → the reworked landing (MVP).
3. Add US2 → validate → consistent copy/location site-wide.
4. Add US3 → validate → live updates.
5. Add US4 → validate → flicker-free admin.
6. Add US5 → validate → team parity on `/`.
7. Polish (T026–T029) → docs + full `quickstart.md`.

### Parallel Team Strategy

With multiple developers after Foundational:
- Developer A: US1 (continuous landing).
- Developer B: US2 (copy/config) and US5 (verify).
- Developer C: US4 (admin list state).
- US3 starts once US1's services island exists (T005).

---

## Notes

- `[P]` = different files, no dependencies.
- No test tasks: the repository has no test runner and the spec did not request TDD; `astro check`/build/lint plus `quickstart.md` are the verification gates.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid same-file conflicts: all `AdminPanel.svelte` edits are sequential in Phase 6; `content.ts` and `config.ts` are touched once (Foundational/US2).
