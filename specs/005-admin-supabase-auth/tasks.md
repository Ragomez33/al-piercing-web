---

description: "Task list for Admin Supabase Auth (replaces PIN) feature implementation"
---

# Tasks: Admin Supabase Auth (replaces PIN)

**Input**: Design documents from `/specs/005-admin-supabase-auth/`

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
- Auth/client → `src/lib/auth.ts`, `src/lib/data/supabase-client.ts`; adapter → `src/lib/data/adapters/`;
  island → `src/components/admin/AdminPanel.svelte`; migration → `supabase/migrations/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and that the auth dependency/migrations location are ready

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0
- [x] T002 [P] Verify `@supabase/supabase-js` is in package.json and `supabase/migrations/` exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared Supabase client, auth helpers, RLS migration and config cleanup — MUST be
complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create src/lib/data/supabase-client.ts — `isSupabaseConfigured()` (true only when BOTH `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are non-empty) and `getSupabaseClient(): SupabaseClient` returning a single shared `createClient` instance, throwing the typed `DataError` ("Supabase no está configurado") when not configured (research §1, contract §1)
- [x] T004 Create src/lib/auth.ts — per contract §2: `getActiveSession(): Promise<{ user: { email: string } } | null>` via `auth.getSession()`; `signInWithEmailPassword(email, password)` via `auth.signInWithPassword`; `signOut()`; `onAuthStateChange(handler)` returning the unsubscribe fn; map provider errors per ERR-01 (contract §3): `Invalid login credentials` → "Credenciales incorrectas", network/timeout → "No se pudo conectar. Intentalo de nuevo", other → "Error de autenticación"
- [x] T005 [P] Create supabase/migrations/0002_admin_auth.sql — RLS split per contract §4, with the existing `0001` permissive policies replaced/scoped: anon may select `products` only `published = true` and select/insert `bookings` (client booking, `PENDING`); authenticated may select all `products`, insert/update `products`, and update `bookings` (status); admin writes rejected when unauthenticated
- [x] T006 Edit src/lib/data/adapters/supabase.ts — replace its internal client factory with `getSupabaseClient()` from supabase-client.ts so every `bookings`/`products` request carries the shared authenticated session (spec §3, FR-009)
- [x] T007 [P] Remove the PIN from src/lib/config.ts and .env.example — delete `ADMIN_PIN` / `PUBLIC_ADMIN_PIN` (feature 005 replaces the PIN gate); keep the remaining env-overridable config

**Checkpoint**: Foundation ready — shared client, auth helpers, RLS and config clean

---

## Phase 3: User Story 1 - Sign in with email & password (Priority: P1) 🎯 MVP

**Goal**: `/admin` shows a Dark/Gold login screen when there is no session; valid credentials reveal
the dashboard; invalid input shows clear errors; without the provider a configuration notice
appears.

**Independent Test**: Open `/admin` signed out → login screen, no admin data; submit invalid
credentials → "Credenciales incorrectas", locked; submit valid credentials → dashboard renders
(quickstart S1–S4).

### Implementation for User Story 1

- [x] T008 [US1] Rework src/components/admin/AdminPanel.svelte into a boot state machine (contract §1) — on mount: if `!isSupabaseConfigured()` render the **configuration-required notice** (FR-010); else `getActiveSession()` → render **LOGIN** or **DASHBOARD**; subscribe once to `onAuthStateChange` (user → DASHBOARD, null → LOGIN) and unsubscribe on destroy; REMOVE the old PIN gate (`ADMIN_PIN`, `sessionStorage` flag) per spec "replaces the PIN"
- [x] T009 [US1] Implement the LOGIN screen in src/components/admin/AdminPanel.svelte — email (`type="email"`, `autocomplete="username"`) + password (`type="password"`, `autocomplete="current-password"`), inline validation (email-shaped, non-empty), `[Ingresar]` (disabled while submitting) calling `signInWithEmailPassword`, and error display via `role="alert"` with the ERR-01 message ("Credenciales incorrectas" / "No se pudo conectar…" / "Error de autenticación") (FR-002/003/004)
- [x] T010 [US1] Wire dashboard loading to the session in src/components/admin/AdminPanel.svelte — call `refresh()` only when the session is active; never fetch bookings/products while logged out (FR-001/FR-009)

**Checkpoint**: At this point, User Story 1 is fully functional — real login gate (MVP)

---

## Phase 4: User Story 2 - Session persistence and sign out (Priority: P2)

**Goal**: A signed-in operator stays signed in across reloads and can end the session with
`[Cerrar Sesión]`, returning the panel to LOGIN.

**Independent Test**: Sign in, reload `/admin` → dashboard without a new login; press
`[Cerrar Sesión]` → login screen returns and admin data is no longer visible (quickstart S5/S6).

### Implementation for User Story 2

- [x] T011 [US2] Add `[Cerrar Sesión]` to the dashboard header in src/components/admin/AdminPanel.svelte — calls `signOut()` and switches to LOGIN on success; after logout a reload still shows LOGIN (FR-006/007/008)
- [x] T012 [P] [US2] a11y/responsive pass for the login screen and header in src/components/admin/AdminPanel.svelte — labels, `aria-pressed`/focus states, targets ≥ 44px, no horizontal scroll at 320px (quickstart S10)

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Authenticated admin operations (Priority: P3)

**Goal**: Every admin write runs under the shared authenticated session and RLS rejects anonymous
writes; docs reflect the new auth requirement.

**Independent Test**: While signed in, confirm/cancel a booking and update stock/publish → succeed;
after signing out the same actions are unreachable (quickstart S7/S8).

### Implementation for User Story 3

- [x] T013 [US3] Confirm and adjust src/lib/data/adapters/supabase.ts — `updateBookingStatus`, `updateProduct` and `createProduct` must all execute through the shared `getSupabaseClient()` and leave unauthenticated/RLS rejections surfacing as typed `DataError` (no false-success) (FR-009)
- [x] T014 [P] [US3] Update `.env.example`, README.md and design-system.md — replace the PIN/`PUBLIC_ADMIN_PIN` references with Supabase Auth notes: admin requires a configured provider and an operator user created in Supabase Auth (Authentication → Users)

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T015 [P] Token pass — grep `src/` for raw hex/rgba: only `src/styles/tokens.css` may contain literals (quickstart S10)
- [x] T016 [P] Island/performance audit — no new islands; only `AdminPanel`, `BookingFlow`, `CatalogGrid`, `CartDrawer` and the canvas hydrate (principle I)
- [x] T017 Run final validation against quickstart.md S1–S10 plus `npx astro check` and `npm run build` at repository root — all MUST pass with zero errors and zero warnings (FR-012/SC-006)
- [x] T018 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — boot machine + login in `AdminPanel.svelte`
- **US2 (P2)**: After US1 — same file (`AdminPanel.svelte`), sequential
- **US3 (P3)**: After Foundational/T006 — verifies the adapter's shared client and RLS; independent
  of the UI stories

### Within Each User Story

- `AdminPanel.svelte` is shared by US1 (T008/T009/T010) and US2 (T011/T012) — strictly sequential
- Services (`supabase-client.ts`, `auth.ts`) before UI wiring

### Parallel Opportunities

- Setup T002; Foundational T005/T007; US2 T012; US3 T014; Polish T015/T016 can run in parallel
  (different files)
- Do NOT parallelize tasks editing `AdminPanel.svelte` (T008 → T011)

---

## Parallel Example: Foundational

```bash
# After Phase 1:
Task: "Create src/lib/data/supabase-client.ts"                # T003
Task: "Create src/lib/auth.ts"                                # T004
Task: "Create supabase/migrations/0002_admin_auth.sql"        # T005
Task: "Edit src/lib/data/adapters/supabase.ts (shared client)" # T006
Task: "Remove PIN from src/lib/config.ts and .env.example"    # T007
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story)
3. Complete Phase 3: User Story 1 (login gate → dashboard)
4. **STOP and VALIDATE**: quickstart S1–S4; `astro check` + `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → shared client + auth helpers + RLS ready
2. Add US1 → test S1–S4 → demo (MVP!)
3. Add US2 → test S5/S6 → demo
4. Add US3 → test S7/S8 → demo
5. Polish → S9/S10 + gates

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: Developer A owns US1 + US2 (shared `AdminPanel.svelte`);
   Developer B owns US3 (adapter + docs)
3. Stories remain independently testable via quickstart S1–S8

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Each user story is independently completable and testable (quickstart S1–S8)
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Auth contract constraints (ERR-01 messages, RLS split in `0002`, shared client session) are quoted
  verbatim and MUST NOT change at implementation time
- The PIN gate (`ADMIN_PIN`, `alpi:admin:unlocked`) is REMOVED by this feature; do not restore it
- No new islands: `AdminPanel.svelte` remains the only admin island
- Commit after each task or logical group; stop at any checkpoint to validate the story independently