---

description: "Task list for the Alternative Setmore-Style Landing Page (Dark Luxury)"
---

# Tasks: Alternative Setmore-Style Landing Page (Dark Luxury)

**Input**: Design documents from `/specs/013-landing-v2/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested. The spec defines no test tasks and the project has no unit-test runner, so this
list contains **no automated test tasks**. Validation is via `npx astro check` / `npm run build` /
`npm run lint` and the manual `quickstart.md` scenarios (final phase).

**Organization**: Tasks are grouped by user story (US1–US3) to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Every task includes the exact file path it changes

## Path Conventions

Single Astro/Svelte project: `src/`, `specs/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verification before changes. The project already exists; no initialization is needed.

- [x] T001 Verify prerequisites: run `npm install`; confirm Node `>=22.12.0` and that `npx astro check` reports **0 errors** on the untouched tree (baseline). Confirm the reuse points exist: `src/components/team/TeamSection.svelte`, `STUDIO_PROFILE`/`PROCESS_STEPS`/`GALLERY_ITEMS` in `src/lib/types/content.ts`, `BRAND_LOGO`/`WHATSAPP_PHONE` in `src/lib/config.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The alternative page shell that every user story renders into.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create `src/pages/landing-v2.astro` as the alternative page shell: import `BaseLayout` (title e.g. "ALPIERCING — Reservas"), import `STUDIO_PROFILE` and `BRAND_LOGO`/`WHATSAPP_PHONE`, and declare page-local constants `OPENING_HOURS` (e.g. "Lun–Sáb · 11:00–20:00") and `INSTAGRAM_URL` (`https://instagram.com/alpiercing`). Render a single `<section class="landing-v2">` container (empty placeholder for the header + island). Do **not** modify `src/pages/index.astro`.

**Checkpoint**: The route `/landing-v2` builds and renders an empty container.

---

## Phase 3: User Story 1 - Understand the studio and book a service (Priority: P1) 🎯 MVP

**Goal**: Visitors see the compact studio profile and a grouped, bookable service list.

**Independent Test**: Open `/landing-v2` and confirm the profile header (identity, description,
address/hours, Instagram + WhatsApp, "Reservas Online 24/7" badge) and the category-grouped service list
render; activate "Reservar" on a service and confirm `/booking?service=<id>` opens with it pre-selected.

- [x] T003 [US1] Add the compact profile header markup to `src/pages/landing-v2.astro` inside the `.landing-v2` section: logo (`BRAND_LOGO`) + wordmark (`STUDIO_PROFILE.brand`), `tagline` and short `bio`, a meta row with the address (`STUDIO_PROFILE.location`) and `OPENING_HOURS` (omit when empty), social links to `INSTAGRAM_URL` and `https://wa.me/<WHATSAPP_PHONE>` (`target="_blank" rel="noopener noreferrer"`, labeled, ≥44px), and a **"Reservas Online 24/7"** status pill. Style with tokens only (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`, `--shadow-glow`), `clamp()` spacing, no horizontal scroll at 320px. Keep `index.astro` untouched.
- [x] T004 [US1] Create `src/components/landing/LandingV2Tabs.svelte` with the **Servicios** panel: on mount call `dataStore.listServices()` (active only); on failure fall back to `listFallbackServices()` and set a `role="status"` notice; add a `role="alert"` only for unexpected errors. Group services using `PIERCING_SERVICE_CATEGORIES` (omit empty groups), each group showing its `label` + `description`. Each service row is a card with `name`, `description`, `durationMinutes` (e.g. "⏱ N min"), `formatCents(priceCents)` (`tabular-nums`), a **"Requiere seña"** badge when `requiresDeposit`, and a **`Reservar`** anchor to `/booking?service=<id>` (≥44px). Include a small `aria-live="polite"` loading hint and an elegant empty state ("No hay servicios disponibles"). Responsive 1→2 columns at ≥768px, `minmax(0, 1fr)`, `overflow-wrap: anywhere`, tokens only. (depends on T002)
- [x] T005 [US1] Mount `<LandingV2Tabs client:load />` in `src/pages/landing-v2.astro` (below the profile header) and finalize the page layout/spacing (`clamp()`, centered max-width container). Confirm no horizontal page scroll at 320px. (depends on T003, T004)

**Checkpoint**: US1 is fully functional and demonstrable on `/landing-v2` (header + bookable services).

---

## Phase 4: User Story 2 - Switch content with quick tabs (Priority: P2)

**Goal**: An accessible in-page tab control switches between Servicios, Equipo and Proceso & Galería.

**Independent Test**: On `/landing-v2`, select each tab and confirm only the matching panel is visible
and the active tab is clearly highlighted; operate the tabs with the keyboard (Left/Right/Home/End) and
confirm focus + `aria-selected`; open `/landing-v2?tab=team` and confirm the Equipo panel opens.

- [x] T006 [US2] Add the accessible tab widget to `src/components/landing/LandingV2Tabs.svelte`: an `activeTab` state (`"services" | "team" | "process"`, default `"services"`); a `role="tablist"` with three `role="tab"` buttons (**Servicios**, **Equipo**, **Proceso & Galería**) carrying `id`, `aria-selected`, `aria-controls`, roving `tabindex` (active `0`, others `-1`) and Arrow/Home/End keyboard handling; a `role="tabpanel"` per area (`aria-labelledby`, `hidden` when inactive). Move the existing Servicios panel inside its tabpanel and add labeled placeholder panels for Equipo and Proceso & Galería. Read `?tab=` on mount and mirror the active tab to the URL with `history.replaceState`. Pill styling: active uses `--accent-primary`/`--accent-on`/`--shadow-glow`, inactive `--bg-badge-pill`/`--text-secondary`; ≥44px; `prefers-reduced-motion` disables transitions. (depends on T004)
- [x] T007 [US2] Ensure tab-panel visibility satisfies the contract: verify with `npx astro check` that the tab widget type-checks, and confirm in `npm run dev` that switching tabs shows exactly one panel, the default is Servicios, and the tabs are keyboard-operable. (depends on T006)

**Checkpoint**: US1 and US2 both work; tabs switch content with full keyboard/ARIA support.

---

## Phase 5: User Story 3 - Build trust with team, process and gallery (Priority: P3)

**Goal**: The Equipo and Proceso & Galería panels show real, trustworthy content.

**Independent Test**: Open the Equipo panel and confirm active members (avatar/placeholder, name,
role/specialty) render with the existing fallback/empty behavior; open Proceso & Galería and confirm the
ordered booking steps, the `/booking` CTA and the featured photos (2/4-col grid, placeholder fallback)
render without overflow.

- [x] T008 [US3] Implement the **Equipo** panel in `src/components/landing/LandingV2Tabs.svelte`: import `TeamSection.svelte` from `../../components/team/TeamSection.svelte` and render it inside the Equipo tabpanel (active members only, with its existing skeleton, `listFallbackTeamMembers()` notice, and renders-nothing-when-empty behavior). Do not duplicate team logic. (depends on T006)
- [x] T009 [US3] Implement the **Proceso & Galería** panel in `src/components/landing/LandingV2Tabs.svelte`: render `PROCESS_STEPS` in `order` (number + `title` + `description`) with a primary CTA to `/booking` ("Reservar mi turno"), then `GALLERY_ITEMS` as tiles (2 cols mobile → 4 cols ≥768px, `aspect-ratio: 1 / 1`, `data-fallback="/images/placeholder.svg"`, `alt`/`label`). Tokens only, `minmax(0, 1fr)`, no horizontal scroll at 320px. (depends on T006)

**Checkpoint**: All three user stories are independently functional on `/landing-v2`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, regression checks and the type/build/lint gates.

- [x] T010 [P] Update `design-system.md`: document the alternative landing page (`/landing-v2`), its compact profile header, the tab island (Servicios/Equipo/Proceso & Galería) and the reuse of `TeamSection` + static content; note that no tokens were added.
- [x] T011 [P] Update `README.md`: add `/landing-v2` to the module table and a short note that it is an alternative landing that reuses the managed data layer and leaves `/` unchanged.
- [x] T012 Run the quality gates: `npx astro check` (**0 errors** — explicit user requirement), `npm run build`, `npm run lint`. Confirm `src/pages/index.astro` and the existing routes are unchanged. (depends on all implementation tasks)
- [x] T013 Execute the `specs/013-landing-v2/quickstart.md` scenarios L1–L12 (including regressions: `/`, catalog/cart, booking submit, admin calendar/Equipo). (depends on T012)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — blocks all user stories (the page shell).
- **User Stories (Phase 3+)**: Depend on Foundational; US2 depends on US1's island (T004); US3 depends on US2's tab panels (T006).
- **Polish (Phase 6)**: Depends on all user stories.

### User Story Dependencies

- **US1 (P1)**: after Foundational. Standalone MVP.
- **US2 (P2)**: after US1 (adds tabs around the existing Servicios panel).
- **US3 (P3)**: after US2 (fills the Equipo and Proceso & Galería panels).

### Within Each User Story

- Page shell (T002) → header (T003) → island + services (T004) → mount (T005) → tabs (T006) → team/process panels (T008–T009).
- `landing-v2.astro` is touched by T002/T003/T005 → sequential.
- `LandingV2Tabs.svelte` is touched by T004/T006/T008/T009 → sequential.
- Story complete and validated before moving to the next priority.

### Parallel Opportunities

- Setup: T001 alone.
- Polish: T010 and T011 are distinct files → parallel; T012 then T013.
- Little parallelism inside this feature because the page and the island are two shared files; the
  parallel marker is used only where files are genuinely independent (T010/T011).

---

## Parallel Example: Polish Phase

```bash
# Distinct files, no interdependencies:
Task: "T010 document the alternative landing in design-system.md"
Task: "T011 add the /landing-v2 route to README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (page shell).
3. Complete Phase 3: US1 (profile header + bookable service list).
4. **STOP and VALIDATE**: open `/landing-v2`, confirm header + grouped services + `Reservar` deep-link;
   run `npx astro check`.
5. Deploy/demo if ready (the page is fully useful without tabs).

### Incremental Delivery

1. Setup + Foundational → route exists.
2. US1 → profile header + bookable services (MVP).
3. US2 → accessible tabs wrapping the three areas.
4. US3 → Equipo + Proceso & Galería content.
5. Polish → docs + gates + quickstart.

### Notes

- [P] = different files, no dependency on an incomplete task.
- [Story] label maps each task to its user story for traceability.
- No automated tests are generated (not requested; no test runner installed). The manual quickstart is
  the validation gate.
- `npx astro check` must report **0 errors** before completion; `npm run build` and `npm run lint` must pass.
- Exactly **one** new island (`LandingV2Tabs` `client:load`); data access only through `dataStore`;
  `TeamSection` is reused as a child component; no Tailwind; `src/pages/index.astro` untouched.
- No schema/data changes and no new dependencies.
