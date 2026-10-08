---

description: "Task list for Landing Page & Base Layout feature implementation"
---

# Tasks: Landing Page & Base Layout

**Input**: Design documents from `/specs/001-landing-page/`

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
- Paths: pages → `src/pages/`, layouts → `src/layouts/`, islands → `src/components/`,
  types → `src/lib/types/`, styles → `src/styles/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the existing Astro + Svelte baseline and create the missing directories

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0 with the current stub pages (src/pages/index.astro, src/pages/catalog.astro, src/pages/booking.astro, src/pages/admin.astro)
- [x] T002 [P] Verify `@astrojs/svelte` integration is active in astro.config.mjs with `integrations: [svelte()]` and svelte.config.js uses vitePreprocess
- [x] T003 [P] Create missing directories `src/layouts/` and `src/lib/types/` (with `.gitkeep`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens, content model and the shared shell (layout, header, canvas) that
MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Complete the design token set in src/styles/tokens.css — MUST define all tokens per the design system (Dark Premium): `--bg-app-body: #111113`, `--bg-card-light: #1A1A1E`, `--bg-surface-elevated: #242429`, `--bg-badge-pill: #202024`, `--border-card: 1px solid #2E2E36`, `--accent-primary: #E5A93C`, `--accent-primary-hover: #F3B94F`, `--accent-primary-glow: rgba(229, 169, 60, 0.25)`, `--accent-on: #111113`, `--accent-wood: #B87A4B`, `--bg-wood-pill: rgba(184, 122, 75, 0.15)`, `--accent-positive: #34D399`, `--accent-negative: #F87171`, `--text-primary: #F4F4F5`, `--text-secondary: #A1A1AA`, `--text-muted: #71717A`, `--text-gold: #E5A93C`, `--radius-card: 16px`, `--radius-pill: 9999px`, `--shadow-card` and `--shadow-glow` (gold); keep the `@import "open-props/style"` + token-based `body` reset (no raw hex in components)
- [x] T005 [P] Create the typed content model in src/lib/types/content.ts — export the exact shapes from `contracts/ui-contract.md` (NavigationItem, StudioProfile, GalleryItem, ProcessStep) plus constants: `NAV_ITEMS` (Inicio → `/`, Catálogo → `/catalog`, Reservar → `/booking`), `STUDIO_PROFILE` (brand, bio, location), `GALLERY_ITEMS` (exactly 4 items; `alt` REQUIRED on every item), `PROCESS_STEPS` (exactly 3 items, `order` 1|2|3, titles verbatim: "Consulta y Diseño", "Reserva con Seña (50%)", "Perforación y Cuidados")
- [x] T006 [P] Create BaseLayout.astro in src/layouts/BaseLayout.astro — global shell rendering: top gold-sheen gradient layer (~first third of viewport height, tokens `--bg-gradient-top-start/End`), the InkBackgroundCanvas island in a background layer behind content (`client:only="svelte"`), `<AppHeader />`, the page `<slot />` and an optional footer slot; import src/styles/tokens.css; layered so content stays above the canvas
- [x] T007 [P] Create AppHeader.astro in src/components/ui/AppHeader.astro — brand centered over the gradient, quick links from `NAV_ITEMS` (Inicio, Catálogo, Reservar) styled as `rounded-full` pills (`--bg-badge-pill`), token-based colors (`--text-secondary`/`--accent-primary`), no client JS
- [x] T008 [P] Create InkBackgroundCanvas.svelte in src/components/canvas/InkBackgroundCanvas.svelte — Canvas 2D ink-flow (soft layered additive blobs), single requestAnimationFrame loop targeting smooth 60fps, pause on `document.visibilitychange` hidden / `window` blur, `devicePixelRatio` clamped to max 2, static-first-frame + no continuous animation when `prefers-reduced-motion: reduce` matches, canvas `aria-hidden="true"` and `pointer-events: none`, sized to its container

**Checkpoint**: Foundation ready — design tokens, content model and shell complete; user story implementation can now begin

---

## Phase 3: User Story 1 - Studio Introduction & Primary Actions (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor sees the studio's specialty, bio and location in the hero, and
can reach the booking flow or catalog in one click from two CTAs.

**Independent Test**: Load `/` → hero (headline, bio, location) renders; "Reservar Turno (50%
Seña)" navigates to `/booking`; "Ver Catálogo de Joyería" navigates to `/catalog` (quickstart S1).

### Implementation for User Story 1

- [x] T009 [US1] Rework src/pages/index.astro to use `BaseLayout` and render the Hero section: exactly one `h1` with a stylized headline (e.g. "Perforaciones profesionales & joyería de titanio"), `STUDIO_PROFILE.bio` + `STUDIO_PROFILE.location`, primary CTA link "Reservar Turno (50% Seña)" → `/booking` styled `rounded-full` with `--accent-primary` + `--shadow-glow`, secondary CTA link "Ver Catálogo de Joyería" → `/catalog` styled `rounded-full` with `--bg-badge-pill`; scoped styles referencing tokens only
- [x] T010 [US1] Verify CTA destinations resolve: `/booking` → src/pages/booking.astro and `/catalog` → src/pages/catalog.astro exist and render (extend stubs with minimal content if needed so navigation works in dev)

**Checkpoint**: At this point, User Story 1 is fully functional — hero + both CTAs (MVP)

---

## Phase 4: User Story 2 - Featured Work Preview (Priority: P2)

**Goal**: A visitor browses a gallery of four featured piercings/body-jewelry pieces.

**Independent Test**: On `/` the gallery shows exactly 4 preview cards using the card
style (charcoal surface, `--border-card`, `--radius-card`, `--shadow-card`); a missing asset falls
back to a placeholder (quickstart S2).

### Implementation for User Story 2

- [x] T011 [P] [US2] Add the gallery section to src/pages/index.astro — responsive grid rendering exactly 4 `GALLERY_ITEMS` cards (image + `alt` + optional label chip `--bg-badge-pill`); missing image asset MUST render a placeholder tile without breaking the grid layout
- [x] T012 [US2] Confirm there is no separate `/gallery` route (the gallery is a section of `/`); the old `src/pages/gallery.astro` stub was removed and any portfolio link dropped

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Process & Trust Explanation (Priority: P3)

**Goal**: A visitor learns the studio workflow via three trust cards.

**Independent Test**: On `/` the process block shows 3 cards in order: "Consulta y Diseño",
"Reserva con Seña (50%)", "Perforación y Cuidados" (quickstart S3).

### Implementation for User Story 3

- [x] T013 [P] [US3] Add the process/trust section to src/pages/index.astro — grid of 3 cards rendered from `PROCESS_STEPS` in fixed `order` (1→3), each showing the step number, `title` and `description`, using the card visual style
- [x] T014 [US3] Wire the step numbering visuals (1/2/3) so orders are always derived from `PROCESS_STEPS[i].order`, never hardcoded markup order

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T015 [P] Responsive pass: verify no horizontal scroll from 320px to 1920px; hero CTAs stack correctly on small widths; touch targets ≥ 44px (quickstart S5)
- [x] T016 [P] Accessibility pass: single `h1` per page, semantic landmarks (header/main), visible focus states, descriptive `alt` on all gallery images, canvas `aria-hidden`, reduced-motion verified (quickstart S6/S7)
- [x] T017 [P] Performance pass: confirm only the canvas island loads client JS; verify DPR clamp and rAF pause in the island; page remains smooth on a mid-range device (SC-004)
- [x] T018 [P] Replace placeholder media: drop studio-provided featured images into public/ and update `GALLERY_ITEMS` in src/lib/types/content.ts (keep `alt` REQUIRED); leave placeholders if no assets are provided yet
- [x] T019 Run final validation against quickstart.md scenarios S1–S7 plus `npx astro check` and `npm run build` at repository root — all MUST pass with zero errors; fix any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - Can proceed sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependencies on other stories (MVP)
- **User Story 2 (P2)**: After Foundational — independent; only reuses `GALLERY_ITEMS` (foundational content model)
- **User Story 3 (P3)**: After Foundational — independent; only reuses `PROCESS_STEPS` (foundational content model)

### Within Each User Story

- Content model (foundational T005) before page sections
- Shell (foundational T006–T008) before any page section renders inside it
- Hero → gallery → process (priority order); each checkpoint validates independently

### Parallel Opportunities

- All tasks marked **[P]** can run in parallel (they touch different files)
- Foundational tasks T005–T008 can run in parallel (different files)
- User story sections are additive in `src/pages/index.astro` — sequential within one file
  is recommended to avoid edit conflicts; polish tasks T015–T018 are parallel-safe

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational files together:
Task: "Complete design tokens in src/styles/tokens.css"              # T004
Task: "Create content model in src/lib/types/content.ts"             # T005
Task: "Create BaseLayout.astro in src/layouts/BaseLayout.astro"      # T006
Task: "Create AppHeader.astro in src/components/ui/AppHeader.astro"  # T007
Task: "Create InkBackgroundCanvas.svelte in src/components/canvas/InkBackgroundCanvas.svelte" # T008
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (hero + dual CTA)
4. **STOP and VALIDATE**: quickstart S1; `astro check` + `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → foundation ready (shell usable on all pages)
2. Add User Story 1 → test S1 → demo (MVP!)
3. Add User Story 2 → test S2 → demo
4. Add User Story 3 → test S3 → demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (hero)
   - Developer B: User Story 2 (featured gallery)
   - Developer C: User Story 3 (process block)
3. Sections merge into `src/pages/index.astro` in sequence; stories remain independently
   testable via quickstart S1/S2/S3

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Each user story is independently completable and testable (quickstart S1–S3)
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Content copy constraints (exactly 4 gallery items, exactly 3 process steps, canonical
  Spanish titles, REQUIRED `alt`) come from data-model.md and MUST not be left to
  implementation-time discretion
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently