---

description: "Task list for Team Members Module, Monthly Admin Calendar & Mobile UX"
---

# Tasks: Team Members Module, Monthly Admin Calendar & Mobile UX

**Input**: Design documents from `/specs/012-team-members-calendar/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested. The spec defines no test tasks and the project has no unit-test runner, so this
list contains **no automated test tasks**. Validation is via `npx astro check` / `npm run build` /
`npm run lint` and the manual `quickstart.md` scenarios (final phase).

**Organization**: Tasks are grouped by user story (US1–US5) to enable independent implementation and
testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task includes the exact file path it changes

## Path Conventions

Single Astro/Svelte project: `src/`, `supabase/`, `specs/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment baseline + a global base style shared by the responsive work.

- [x] T001 Verify prerequisites: run `npm install`; confirm Node `>=22.12.0` and that `npx astro check` runs clean on the untouched tree (baseline before changes).
- [x] T002 [P] Ensure the global reset `*, *::before, *::after { box-sizing: border-box; }` exists in `src/styles/tokens.css` (add it if absent) so padding never expands elements past their container.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The team data foundation, shared by US1 (public section) and US2 (admin CRUD).

**⚠️ CRITICAL**: US1 and US2 cannot begin until this phase is complete. (US3–US5 do not depend on it, but are lower priority.)

- [x] T003 [P] Add the `TeamMember` and `NewTeamMemberInput` interfaces to `src/lib/types/domain.ts`. `TeamMember`: `id: string` (UUID), `name: string`, `role: string`, `avatarUrl: string`, `bio: string`, `instagramHandle: string`, `isActive: boolean`, `createdAt: string` (ISO). `NewTeamMemberInput` excludes `id`/`isActive`/`createdAt`.
- [x] T004 [P] Create the demo seed `src/lib/data/team.ts` exporting `TEAM_MEMBERS: TeamMember[]` (2–3 sample artists, `isActive: true`, fixed UUIDs). Do not import it from `types/domain.ts` (avoid a cycle).
- [x] T005 [P] Add the `team_members` table types (`Row`/`Insert`/`Update`/`Relationships`) to `src/types/supabase.ts`, mirroring the SQL (snake_case columns, uuid `id`, empty-string defaults).
- [x] T006 [P] Create `supabase/migrations/0006_team_members.sql`: `create table if not exists public.team_members (id uuid primary key default gen_random_uuid(), name text not null, role text not null, avatar_url text not null default '', bio text not null default '', instagram_handle text not null default '', is_active boolean not null default true, created_at timestamptz not null default now())`; enable RLS; policies (public `select` where `is_active = true`; authenticated `select`/`insert`/`update`/`delete`); `grant all … to anon, authenticated, service_role`. No production seed.
- [x] T007 Extend the `DataStore` interface in `src/lib/types/domain.ts` with `listTeamMembers(input?: { includeInactive?: boolean }): Promise<TeamMember[]>`, `createTeamMember(input: NewTeamMemberInput): Promise<TeamMember>`, `updateTeamMember(id: string, patch: Partial<NewTeamMemberInput> & { isActive?: boolean }): Promise<TeamMember>`, `deleteTeamMember(id: string): Promise<void>`. (Same file as T003 — run after it.)
- [x] T008 [P] Implement the team CRUD in `src/lib/data/adapters/local.ts`: key `alpi:team:v1`, seeded from `TEAM_MEMBERS` when absent; `isTeamMember` read guard; validate `name`/`role` non-empty and normalize `instagramHandle` (trim + strip one leading `@`) on create/update; throw typed `DataError` on invalid input; generate `id` with `crypto.randomUUID()`.
- [x] T009 [P] Implement the team CRUD in `src/lib/data/adapters/supabase.ts`: add `toTeamMember(row)` (snake_case → camelCase) and the four operations against `public.team_members` via the shared typed client; narrow invalid categories/shapes to typed `DataError`.
- [x] T010 Add `listFallbackTeamMembers()` to `src/lib/data/store.ts` (returns `createLocalAdapter().listTeamMembers()`), mirroring `listFallbackServices()`. Depends on T008.
- [x] T011 [P] Generalize `src/lib/services/storage.ts`: add `uploadImage(file: File, options: { prefix: string }): Promise<string>` (production → public `products` bucket at `<prefix><timestamp>-<uuid>.<ext>`; demo → FileReader data URL; reject non-images with `DataError`), and rewrite `uploadProductImage(file)` as `uploadImage(file, { prefix: "product-" })` so product behavior is unchanged.

**Checkpoint**: The team entity, adapters and storage helper are ready — US1 and US2 can begin.

---

## Phase 3: User Story 1 - Public "Nuestro Equipo / Artistas" section (Priority: P1) 🎯 MVP

**Goal**: Visitors see the studio's active artists on the landing page, sourced from the managed data.

**Independent Test**: With active members in the data source, open `/` and confirm each member renders (avatar/placeholder, name, role, bio, Instagram link when present); with none active, the section is absent and the page is unaffected.

- [x] T012 [P] [US1] Create `src/components/team/TeamSection.svelte` (island): fetch `dataStore.listTeamMembers()`, render Dark-Luxury cards (avatar with `/images/placeholder.svg` via `data-fallback`, name, role, wrap-safe bio, Instagram link only when a handle exists — `https://instagram.com/<handle>`, `target="_blank" rel="noopener noreferrer"`), a small loading skeleton, a `role="status"` notice + `listFallbackTeamMembers()` fallback on read failure, and render nothing when there are no active members. Responsive card grid (1 → 2–3 cols), tokens only, `overflow-wrap: anywhere`.
- [x] T013 [US1] Mount `<TeamSection client:visible />` in `src/pages/index.astro` (new section after the gallery/process block). Depends on T012.

**Checkpoint**: US1 works independently (demo seed provides members in demo mode).

---

## Phase 4: User Story 2 - Admin "Equipo" management (Priority: P1)

**Goal**: An authenticated operator manages the roster (create/edit/activate/deactivate/delete) with avatar upload.

**Independent Test**: Sign in, open `/admin?tab=team`, create a member with an avatar, edit their role/bio, deactivate, then delete — each change persists and is reflected publicly.

- [x] T014 [US2] In `src/components/admin/AdminPanel.svelte`: add `"team"` to the `AdminTab` union, a sidebar link (`Users` icon from `lucide-svelte`) after Servicios, `?tab=team` deep-link handling in `onMount`, and a `refreshTeam()` loader using `dataStore.listTeamMembers({ includeInactive: true })`.
- [x] T015 [US2] Implement the Equipo list in `src/components/admin/AdminPanel.svelte`: rows with avatar thumbnail, `name`, `role`, an active toggle (`role="switch"`, `aria-checked`, disabled while busy), an "Inactivo" chip, plus `[Editar]` and `[Eliminar]` actions; loading hint (`aria-live`), error alert (`role="alert"`) and an empty state.
- [x] T016 [US2] Implement the create/edit modal in `src/components/admin/AdminPanel.svelte`: fields Nombre* / Rol* / Bio / Instagram / Avatar (file `accept="image/*"` with live preview); validate name+role non-empty; on save call `uploadImage(file, { prefix: "team-" })` when a file is chosen, then `dataStore.createTeamMember`/`updateTeamMember`; show "Subiendo imagen…" while busy; keep the modal open and show a `role="alert"` on error.
- [x] T017 [US2] Implement the delete confirmation dialog (`role="alertdialog"`) in `src/components/admin/AdminPanel.svelte` calling `dataStore.deleteTeamMember(id)`.
- [x] T018 [US2] Wire success paths in `src/components/admin/AdminPanel.svelte`: after every successful mutation close the modal/dialog and re-run `refreshTeam()` (no optimistic list edits); surface `DataError` messages inline.

**Checkpoint**: US1 and US2 both work independently; the studio can populate the public section.

---

## Phase 5: User Story 3 - Desktop monthly calendar (Priority: P2)

**Goal**: The admin calendar shows a monthly grid with per-day appointment badges and a day detail with actions.

**Independent Test**: Open `/admin?tab=calendar` on a wide screen, confirm the 42-cell month grid with day badges and the `[Hoy]`/pager controls; click a day, approve/cancel/reschedule an appointment and create/delete a block.

- [x] T019 [P] [US3] Extend `src/lib/utils/calendar.ts` with `startOfMonth(date)`, `addMonths(date, delta)`, `monthLabel(date)` (e.g. "octubre 2026"), `monthGrid(monthStart): MonthDayCell[]` (exactly 42 Monday-start cells: `{ date, dayNumber, inMonth, isToday }`), and `dayStatusSummary(bookings, date): { total, pending, confirmed, cancelled }`. Keep `calendarRows`/`buildOccupancies`/`isBusy` for reschedule/block validation.
- [x] T020 [US3] Rewrite the top of `src/components/admin/AdminCalendar.svelte`: replace the week state with `monthStart`, add the month pager (`‹ Mes Año ›`) + `[Hoy]`, render the weekday header (lun–dom) and the 42-cell grid; each in-month cell shows the day number, a total-count badge (hidden at 0) and pending/confirmed/cancelled status dots; the selected day is highlighted and today is marked. Depends on T019.
- [x] T021 [US3] Add the day-detail region to `src/components/admin/AdminCalendar.svelte`: chronological list of the selected day's appointments (time, client, service, status badge, duration) and blocks (label + time + duration); clicking an appointment opens the existing booking detail modal; keep `[Aprobar Cita]` → `approveBooking(id, WHATSAPP_PHONE)`, `[Cancelar Cita]` → `cancelBooking(id)`, and `[Reagendar]` → `dataStore.updateBookingSchedule(id, { date, timeSlot })` with free-slot validation via `buildOccupancies`/`isBusy`/`calendarRows`. Reload data after each success; errors inline (`role="alert"`).
- [x] T022 [US3] Add the block create/manage flow to `src/components/admin/AdminCalendar.svelte`: a `[Nuevo bloqueo]` button on the selected day opening a modal with a slot select (09:00–19:30, 30-min steps), label and duration (15/30/60/90/120, default 30) → `dataStore.createBlock`; clicking a block opens a modal with `[Eliminar Bloqueo]` → `dataStore.deleteBlock`.
- [x] T023 [US3] Clean up `src/components/admin/AdminCalendar.svelte` (and optionally `src/lib/utils/calendar.ts`): remove now-unused weekly geometry imports/helpers (`topForTime`, `heightForMinutes`, `timeAtOffsetY`, `startOfWeek`/`weekDays` if truly unused) so `astro check`/lint stay clean. Depends on T020–T022.

**Checkpoint**: US3 delivers the month overview + day actions; US4 builds on the same component.

---

## Phase 6: User Story 4 - Mobile calendar (Priority: P2)

**Goal**: Below 768px the calendar becomes a horizontal day selector + a vertical appointment list with a clear service breakdown.

**Independent Test**: At 360px, `>=768px` hidden grid; a scrollable day strip and the selected day's vertical list render with no horizontal page scroll; selecting another day updates the list.

- [x] T024 [US4] In `src/components/admin/AdminCalendar.svelte`, add the `<768px` layout: a horizontally scrollable day selector (day chips for the month; today + selected highlighted; `overflow-x: auto`, page never scrolls horizontally) and a vertical appointment list for the selected day showing the **service breakdown** (`HH:mm`, client, service name, status badge, notes) plus blocks with a delete action; default the selected day to today (or the first day of the displayed month). Reuse the booking detail modal actions. Depends on US3 (T020–T022).
- [x] T025 [US4] Add the responsive styles in `src/components/admin/AdminCalendar.svelte`: `min-width: 0` on list children, wrapping cards (no `<table>`), ≥44px targets, `prefers-reduced-motion` honored, and a `@media (max-width: 767px)` switch that hides the grid and shows the strip+list (and vice-versa at `min-width: 768px`).

**Checkpoint**: US3 (desktop) and US4 (mobile) both work; the calendar is usable on phone and desktop.

---

## Phase 7: User Story 5 - Mobile shell & layout hardening (Priority: P3)

**Goal**: A smooth hamburger drawer on the public header and no horizontal overflow in catalog, cart and booking checkout at 320px.

**Independent Test**: At ≤414px open/close the hamburger drawer (link/Escape/backdrop, focus + scroll lock); at 320px browse `/catalog` (open the cart) and reach `/booking`'s checkout with zero horizontal page scroll.

- [x] T026 [P] [US5] Create `src/components/ui/MobileNav.svelte` (island): a `lucide-svelte` `Menu`/`X` toggle (`aria-label`, `aria-expanded`, `aria-controls`, ≥44px) and an off-canvas drawer rendering `NAV_ITEMS` with the active route from `window.location.pathname`; open → focus the panel + lock body scroll; close on link selection / `Escape` / backdrop → restore focus to the toggle + release the lock; `onDestroy` cleans up. Tokens only (`--overlay-backdrop`, `--z-overlay`/`--z-modal`, `--bg-navbar-glass`, `--blur-navbar`, `--shadow-glow`), reduced motion honored.
- [x] T027 [US5] Wire the drawer into `src/components/ui/AppHeader.astro`: keep brand + desktop nav, hide the desktop `.nav` below 768px, and mount `<MobileNav client:load />` (above-the-fold island). Depends on T026.
- [x] T028 [P] [US5] Fix small-screen overflow in `src/components/catalog/CatalogGrid.svelte` and `src/components/catalog/ProductCard.svelte`: `clamp()` container padding, `min-width: 0` on grid children, `overflow-wrap: anywhere` on names/prices, ≥44px add control, no horizontal page scroll at 320px.
- [x] T029 [P] [US5] Fix `src/components/catalog/CartDrawer.svelte`: drawer `width: min(420px, 100%)`, `clamp()` internal padding, line items `min-width: 0` with wrapping names, ≥44px qty/remove controls, full-width checkout; drawer scrolls internally only.
- [x] T030 [P] [US5] Fix `src/components/booking/BookingFlow.svelte`: `clamp()` padding, wrapping selected-service summary, full-width form controls (`box-sizing: border-box`), smaller slot grid column floor (e.g. `minmax(64px, 1fr)`), wrapping deposit rows; no horizontal page scroll at 320px; keep the success modal `min(440px, calc(100% - 2rem))`.

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, regression checks and the type/build/lint gates.

- [x] T031 [P] Update `design-system.md`: document the landing Team section, the monthly calendar (desktop grid + mobile day strip/list) and the mobile navigation drawer; note any token additions.
- [x] T032 [P] Update `README.md`: module table (landing team section; admin "Equipo"), the hybrid data note (team CRUD + `alpi:team:v1`), and the new migration `0006_team_members.sql`.
- [x] T033 Run the quality gates: `npx astro check` (**0 errors** — explicit user requirement), `npm run build`, `npm run lint`. Depends on all implementation tasks.
- [ ] T034 Execute the `specs/012-team-members-calendar/quickstart.md` scenarios S1–S16 (including regressions: booking submit + success panel, catalog/cart checkout, admin Servicios CRUD, calendar approve/cancel/reschedule). Depends on T033.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks US1 and US2** (US3–US5 may start once Setup is done).
- **User Stories (Phase 3+)**: Depend on their prerequisites (below).
- **Polish (Phase 8)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 (P1)**: after Foundational (team data). No dependency on other stories.
- **US2 (P1)**: after Foundational (team data). Independent of US1.
- **US3 (P2)**: after Setup only (own month helpers). Independent of US1/US2.
- **US4 (P2)**: depends on **US3** (same component + helpers).
- **US5 (P3)**: after Setup only. Independent of all other stories.

### Within Each User Story

- Month helpers (T019) before the grid (T020) before day detail/blocks (T021–T022) before cleanup (T023).
- `MobileNav.svelte` (T026) before wiring it (T027).
- Story complete and validated before moving to the next priority.

### Parallel Opportunities

- Setup: T002 in parallel with T001.
- Foundational: T003, T004, T005, T006, T008, T009, T011 are distinct files and can run in parallel; T007 follows T003 (same file); T010 follows T008.
- US1: T012 (component) before T013 (page mount).
- US2: T014–T018 all touch `AdminPanel.svelte` → sequential.
- US3: T019 (`calendar.ts`) parallel with nothing else in-phase, then T020–T023 sequential (`AdminCalendar.svelte`).
- US4: T024–T025 touch the same component → sequential.
- US5: T026, T028, T029, T030 are distinct files → parallel; T027 follows T026.
- Polish: T031 and T032 parallel; T033 then T034.

---

## Parallel Example: Foundational Phase

```bash
# Distinct files, no interdependencies:
Task: "T003 add TeamMember types in src/lib/types/domain.ts"
Task: "T004 add demo seed in src/lib/data/team.ts"
Task: "T005 add team_members types in src/types/supabase.ts"
Task: "T006 create supabase/migrations/0006_team_members.sql"
Task: "T008 implement local adapter team CRUD in src/lib/data/adapters/local.ts"
Task: "T009 implement supabase adapter team CRUD in src/lib/data/adapters/supabase.ts"
Task: "T011 generalize upload helper in src/lib/services/storage.ts"
```

## Parallel Example: User Story 5

```bash
Task: "T026 create src/components/ui/MobileNav.svelte"
Task: "T028 fix overflow in CatalogGrid.svelte + ProductCard.svelte"
Task: "T029 fix overflow in CartDrawer.svelte"
Task: "T030 fix checkout overflow in BookingFlow.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 — both P1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (team data) — **blocks the P1 stories**.
3. Complete Phase 3: US1 (public section) and Phase 4: US2 (admin Equipo) — the two P1 stories.
4. **STOP and VALIDATE**: quickstart S1–S7 + S14–S15; run `npx astro check`.
5. Deploy/demo if ready (the demo seed makes US1 demonstrable even before US2 is exercised).

### Incremental Delivery

1. Setup + Foundational → team foundation ready.
2. US1 + US2 → studio can manage and display the team (MVP).
3. US3 → monthly desktop calendar.
4. US4 → mobile calendar.
5. US5 → mobile shell/overflow polish.
6. Polish → docs + gates + quickstart.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Then: Developer A takes US1+US2 (shared team feature), Developer B takes US3→US4 (calendar),
   Developer C takes US5 (mobile shell).
3. Stories integrate independently; US4 follows US3.

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- [Story] label maps each task to its user story for traceability.
- No automated tests are generated (not requested; no test runner installed). The manual quickstart is the
  validation gate.
- `npx astro check` must report **0 errors** before completion; `npm run build` and `npm run lint` must pass.
- Data access only through `dataStore`/`src/lib/services`; two new islands only (`TeamSection` `client:visible`,
  `MobileNav` `client:load`); no Tailwind; money stays integer cents; appointment transitions stay in
  `src/lib/services/booking.ts`.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
