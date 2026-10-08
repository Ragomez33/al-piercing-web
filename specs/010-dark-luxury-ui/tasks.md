---

description: "Task list for Dark Luxury UI Redesign feature implementation"
---

# Tasks: Dark Luxury UI Redesign

**Input**: Design documents from `/specs/010-dark-luxury-ui/`

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
- Tokens → `src/styles/tokens.css`; layout → `src/layouts/BaseLayout.astro`; public shell →
  `src/components/ui/AppHeader.astro` and `src/components/Footer.astro`; admin island →
  `src/components/admin/AdminPanel.svelte`; docs → `design-system.md`, `README.md`
- **Token rule**: raw color/radius/shadow/spacing values are permitted ONLY in `src/styles/tokens.css`;
  every component consumes `var(--token)` and uses scoped `<style>`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and confirm the target files

- [X] T001 Verify baseline: run `npx astro check` (MUST be 0 errors), `npm run build` and `npm run lint` at repository root; all MUST pass before changes
- [X] T002 [P] Confirm target files and that no data layer changes are needed: `src/styles/tokens.css`, `src/layouts/BaseLayout.astro`, `src/components/ui/AppHeader.astro`, `src/components/Footer.astro`, `src/components/admin/AdminPanel.svelte`; confirm `src/lib/data/**`, `src/lib/services/**` and `src/lib/types/**` stay untouched

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared tokens and the page stacking model — MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Update `src/styles/tokens.css` (raw values only here): set `--bg-navbar-glass` to the
  requested translucent dark (`rgba(17, 17, 19, 0.9)`) and `--blur-navbar` to `12px`; add refined
  form-control tokens `--bg-control` (refined dark surface ≈ `#18181B`), `--border-control`
  (`1px solid rgba(255,255,255,0.15)`), change `--control-padding` to `0.625rem 1rem`, set
  `--control-min-height` to `44px` (never below the 44px tactile minimum) and add
  `--control-font-size: 0.95rem`; set `--bg-footer` to the near-black `#0A0A0C`; add z-layer tokens
  `--z-header: 30`, `--z-overlay: 40`, `--z-modal: 41` (public-shell-contract §4, form-controls-contract
  §1, research R2/R4/R5/R7)
- [X] T004 [P] Fix the page stacking model in `src/layouts/BaseLayout.astro`: `<main>` MUST keep
  `position: relative` but MUST NOT set a numeric `z-index` (remove the stacking-context trap); set the
  decorative `.top-gradient` to layer `0` so `<main>` still paints above the decorations by DOM order;
  and render the public `<Footer />` on public routes only (`{!isAdmin && <Footer />}`) since `/admin`
  uses its own shell (public-shell-contract §4, plan Complexity Tracking, research R7)

**Checkpoint**: Tokens and layering ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - The visitor navigates from a full-width sticky header (Priority: P1) 🎯 MVP

**Goal**: Replace the floating glass capsule with a full-width sticky top bar (brand left, navigation
right) sharing the glassy dark surface, with a distinguishable active destination.

**Independent Test**: Load each public page and scroll → the bar spans the full width, stays pinned at the
top, keeps brand-left / nav-right, routes correctly, shows the active destination, and produces no
horizontal scroll at 320px (quickstart S1/S2/S3).

> Both tasks edit `src/components/ui/AppHeader.astro` — run sequentially, no `[P]`.

- [X] T005 [US1] Rewrite `src/components/ui/AppHeader.astro` structure: a full-width `<header>` with a
  centered container row (`max-width: 1080px`, auto margins, token-based padding) placing the
  brand/logo (`BRAND_LOGO` + `STUDIO_PROFILE.brand`) on the left and a `<nav aria-label="Navegación
  principal">` with one link per `NAV_ITEMS` entry on the right; compute the active route from
  `Astro.url.pathname` (exact match for `/`, prefix match for `/catalog` and `/booking`) and expose it via
  `aria-current="page"` plus an `.active` class (public-shell-contract §1/§2, FR-001/FR-003/FR-005)
- [X] T006 [US1] Style `src/components/ui/AppHeader.astro` (scoped `<style>`, tokens only): sticky
  `position: sticky; top: 0` at `--z-header`; translucent surface `--bg-navbar-glass` with
  `backdrop-filter: blur(var(--blur-navbar))` and a `--divider-subtle` bottom border; nav links with
  generous spacing, ≥44px targets, visible focus ring, gold active/hover treatment, and a wrapping row
  that stays usable at 320px with no horizontal page scroll; disable transitions under
  `prefers-reduced-motion: reduce` (public-shell-contract §2, FR-001/FR-002/FR-004/FR-005/FR-016/FR-017)

**Checkpoint**: User Story 1 fully functional — full-width sticky header (MVP)

---

## Phase 4: User Story 2 - The operator works from a dashboard-style admin layout (Priority: P2)

**Goal**: Replace the admin top bar + loose tab buttons with a two-region dashboard shell: a left
sidebar (brand, vertical Calendario/Inventario nav with gold active state, user info + logout at the
bottom) and a spacious main content area, collapsing to an accessible drawer on small screens.

**Independent Test**: Sign in at `/admin` → sidebar shows brand, both sections, active highlighting, user
info and logout; switching sections updates the main area and `?tab=`; logout works; below the medium
breakpoint the navigation is a labeled drawer that does not cause horizontal scroll (quickstart S7/S8/S9).

> Both tasks edit `src/components/admin/AdminPanel.svelte` (dashboard branch only) — run sequentially,
  no `[P]`. The `checking`/`notice`/`login` gate branches stay as-is.

- [X] T007 [US2] Restructure the dashboard branch of `src/components/admin/AdminPanel.svelte` into a
  sidebar + main shell: a semantic navigation region with the "ALPIERCING Admin" brand (logo + wordmark)
  at the top, a vertical list of section buttons (Calendario = `calendar`, Inventario = `catalog`) using
  lucide icons, and — at the bottom — the mode badge, the signed-in email and the `Cerrar Sesión` button
  wired to the existing `logout()`; a main content region (`flex: 1`, generous padding) hosting the
  existing `<AdminCalendar />` and inventory markup unchanged; preserve `switchTab` and the `?tab=` query
  sync and do NOT alter any data actions (admin-shell-contract §1/§4, FR-006/FR-007/FR-009)
- [X] T008 [US2] Add the sidebar/drawer behavior and styles in `src/components/admin/AdminPanel.svelte`
  (scoped `<style>`, tokens only): persistent sidebar on wide screens (`position: sticky; top: 0;
  height: 100vh`, fixed width, right divider) with a gold active state (`--accent-primary`/`--accent-on`)
  and refined hover on inactive items; below the medium breakpoint an off-canvas drawer toggled by a
  labeled button exposing `aria-expanded`/`aria-controls`, with a backdrop that closes it, focus moved
  into the drawer on open and returned to the toggle on close, `Escape` to close, transitions disabled
  under `prefers-reduced-motion: reduce`, and no horizontal scroll at 320px; ensure the drawer/backdrop
  sits below the existing admin modals (`--z-overlay` < `--z-modal`) (admin-shell-contract §2/§3/§5,
  FR-008/FR-016/FR-017, research R6/R7)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - The client fills refined, compact form fields (Priority: P3)

**Goal**: Make every form control shorter and more refined with a defined border and a soft gold focus
state, without changing entry/validation/submission behavior.

**Independent Test**: Focus and type in text/date/select/textarea controls across booking and admin forms →
one refined surface, defined border, compact height (≥44px), soft gold focus border + outer ring, muted
placeholder; behavior unchanged (quickstart S4).

- [X] T009 [US3] Update the shared `.input` skin in `src/styles/tokens.css` to consume the new control
  tokens: surface `--bg-control`, border `--border-control`, `--radius-image`, `padding:
  var(--control-padding)`, `min-height: var(--control-min-height)`, `font-size: var(--control-font-size)`,
  keep `color-scheme: dark`, and set the focus state to `border-color: var(--accent-primary)` plus a soft
  outer ring (`box-shadow: 0 0 0 3px var(--accent-primary-glow)`), replacing the hard outline; keep `.field`
  unchanged (flex column, `--text-secondary`, weight 600) (form-controls-contract §1–§3,
  FR-010/FR-011/FR-012)

**Checkpoint**: Refined compact form controls applied app-wide via the single shared skin

---

## Phase 6: User Story 4 - The visitor sees a structured footer (Priority: P3)

**Goal**: Rebuild the footer as an independent, full-width section with a three-column grid (brand +
description · quick links/socials · FORGE Labs credits) that stacks on small screens.

**Independent Test**: Scroll to the bottom of each public page → full-width section with top divider and
three groups, correct Instagram/WhatsApp targets, brand/year line, and 1→3 column responsive stacking with
no horizontal scroll (quickstart S5/S6).

- [X] T010 [US4] Rebuild `src/components/Footer.astro` as a full-width `<footer>` section on
  `--bg-footer` with a `--divider-subtle` top divider and generous padding, containing a centered CSS
  grid of three groups: (1) brand/logo + short description, (2) quick links / social channels
  (Instagram + WhatsApp with the existing inline SVG icons, external links `target="_blank"`
  `rel="noopener noreferrer"`, ≥44px targets), (3) FORGE Labs signature + credits; add a brand/year line;
  make the grid 1 column on narrow viewports and 3 columns from a medium breakpoint, with no horizontal
  page scroll (scoped `<style>`, tokens only) (public-shell-contract §3, FR-013/FR-014/FR-016)

**Checkpoint**: All four user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, audits and final validation

- [X] T011 [P] Update `design-system.md` to describe the new layout: full-width sticky public header
  (active state, glass surface), the three-column footer section, the compact refined form-control
  skin/tokens, the admin sidebar/drawer shell, the new z-layer tokens, and the stacking model; update
  `README.md` structure/notes accordingly (constitution SDD §3, FR-018)
- [X] T012 [P] Accessibility & responsive audit across all touched surfaces: keyboard-only reachability,
  visible focus, ≥44px targets, `prefers-reduced-motion`, drawer `aria-expanded`/`aria-controls`/Escape,
  and no horizontal page scroll from 320px to 1920px (FR-016/FR-017, SC-004/SC-005)
- [X] T013 [P] Token audit: grep `src/` for raw `#hex`/`rgba(` and confirm only `src/styles/tokens.css`
  contains literals (constitution §II)
- [X] T014 Run the `quickstart.md` scenarios S1–S11 (header sticky/active, 320px, compact controls,
  footer columns, admin shell/drawer, overlay precedence, behavior preservation)
- [X] T015 Run `npx astro check` (MUST be **0 errors**), `npm run build` and `npm run lint` at repository
  root — all MUST pass (FR-018, SC-006, explicit user requirement)
- [X] T016 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational; US3 further depends on T003 (control tokens)
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — edits `AppHeader.astro`
- **US2 (P2)**: After Foundational — edits `AdminPanel.svelte`
- **US3 (P3)**: After Foundational (T003 control tokens) — edits the `.input` skin in `tokens.css`
- **US4 (P3)**: After Foundational (T003 footer token) — edits `Footer.astro`

### Within Each User Story

- Structure before styling when the same file is edited (`AppHeader`: T005 → T006; `AdminPanel`: T007 → T008)
- Foundational `tokens.css` edits (T003) complete before the US3 `tokens.css` skin edit (T009)

### Parallel Opportunities

- Setup: T002
- Foundational: T003 and T004 (different files)
- Once Foundational completes, US1 (AppHeader), US2 (AdminPanel), US4 (Footer) can run in parallel
  (different files); US3 edits `tokens.css` after T003
- Polish: T011, T012, T013 can run in parallel (different concerns/files)
- Do NOT parallelize tasks editing the same file (`AppHeader.astro`, `AdminPanel.svelte`, `tokens.css`)

---

## Parallel Example: After Foundational

```bash
# Different files → can run in parallel:
Task: "Rewrite src/components/ui/AppHeader.astro (sticky bar + active nav)"  # US1
Task: "Restructure src/components/admin/AdminPanel.svelte (sidebar shell)"   # US2
Task: "Rebuild src/components/Footer.astro (3-column section)"               # US4
Task: "Update .input skin in src/styles/tokens.css (after T003)"             # US3
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (full-width sticky header)
4. **STOP and VALIDATE**: quickstart S1–S3 + `npx astro check` / `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → tokens + layering ready
2. Add US1 → test S1–S3 → demo (MVP!)
3. Add US2 → test S7–S9 → demo
4. Add US3 → test S4 → demo
5. Add US4 → test S5/S6 → demo
6. Polish → S10/S11 + gates (T011–T016)

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (`AppHeader.astro`)
   - Developer B: US2 (`AdminPanel.svelte`, T007 → T008)
   - Developer C: US4 (`Footer.astro`) and US3 (`.input` in `tokens.css`)
3. Stories complete and integrate independently; final overlay/behaviour checks (S10/S11) together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Prompt hints mapped verbatim to tokens in the contracts; quotes to honor at implementation time:
  - Header: full-width, `position: sticky; top: 0`, translucent dark + blur + bottom divider, brand
    left / nav right with generous spacing, active destination distinguishable by color.
  - Controls: compact height (never below 44px), refined surface, defined border, soft gold focus border +
    outer ring.
  - Footer: independent full-width section, top divider, 3 groups (brand+description · links/socials ·
    FORGE Labs credits), 1→3 responsive columns.
  - Admin: sidebar (`sticky`, `height: 100vh`, fixed width, right divider) with brand, vertical
    Calendario/Inventario nav (gold active), user info + logout at the bottom; level-1 content area;
    accessible drawer on small screens.
  - Stacking: `--z-header: 30` < `--z-overlay: 40` < `--z-modal: 41`; `<main>` must not trap overlays.
- No Tailwind, no new `client:*` directives, no new libraries; raw values only in `tokens.css`
- No data/schema/type/service changes; existing journeys MUST keep working (FR-015/FR-018)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
