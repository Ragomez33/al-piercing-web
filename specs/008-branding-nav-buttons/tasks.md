---

description: "Task list for Icon Branding, Navigation & Button System feature implementation"
---

# Tasks: Icon Branding, Navigation & Button System

**Input**: Design documents from `/specs/008-branding-nav-buttons/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is done
through `quickstart.md` scenarios S1–S10 plus `astro check` / `npm run build` gates.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro project)
- Components → `src/components/`; layout → `src/layouts/BaseLayout.astro`; tokens →
  `src/styles/tokens.css`; config → `src/lib/config.ts`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and the brand asset

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0
- [x] T002 [P] Verify the brand asset exists at `public/images/logo.png` (per the 2026-10-07 clarification, NOT `icon.png`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New design tokens and the global constants that ALL stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add the new tokens to src/styles/tokens.css (Design Parity, FR-011): `--bg-navbar-glass: rgba(17,17,19,0.85)`, `--blur-navbar: 16px`, `--border-glass: 1px solid rgba(255,255,255,0.08)`, `--border-glass-strong: 1px solid rgba(255,255,255,0.12)`, `--shadow-dock: 0 10px 30px -10px rgba(0,0,0,0.5)`, `--radius-btn: 12px`, `--glow-btn-primary: 0 4px 20px rgba(229,169,60,0.3)`, `--bg-btn-secondary: rgba(255,255,255,0.04)`, `--border-btn-secondary: 1px solid rgba(255,255,255,0.12)`, `--border-btn-secondary-hover: 1px solid rgba(229,169,60,0.4)`
- [x] T004 [P] Extend src/lib/config.ts — `export const BRAND_LOGO: string = "/images/logo.png";` and `export const ADMIN_PREFIX: string = "/admin";` (contract §1, research §1)

**Checkpoint**: Foundation ready — tokens and constants available to every story

---

## Phase 3: User Story 1 - Public and admin navigation are separated (Priority: P1) 🎯 MVP

**Goal**: The public dock appears on `/`, `/catalog`, `/booking` and is absent on `/admin`; the admin
keeps its own header.

**Independent Test**: Open the three public routes → dock visible; open `/admin` → no public dock,
only the admin header (quickstart S1).

### Implementation for User Story 1

- [x] T005 [US1] Edit src/layouts/BaseLayout.astro — compute `const isAdmin = Astro.url.pathname.startsWith(ADMIN_PREFIX);` in the frontmatter and render `<AppHeader />` only when `!isAdmin` (FR-001/FR-002)

**Checkpoint**: At this point, User Story 1 is fully functional — public dock hidden on `/admin` (MVP)

---

## Phase 4: User Story 2 - The public navigation floats in a glass capsule (Priority: P2)

**Goal**: The public navbar is a centered, dark-glass pill dock with the logo at the left, readable
over content.

**Independent Test**: On any public page the nav renders as a centered rounded capsule with the logo
left, glass surface and shadow (quickstart S2/S3).

### Implementation for User Story 2

- [x] T006 [US2] Rework src/components/ui/AppHeader.astro into the docked capsule — `.dock` pill (centered, `max-width: 650px`, `margin-top: 1rem`, `border-radius: var(--radius-pill)`, `background: var(--bg-navbar-glass)`, `backdrop-filter: blur(var(--blur-navbar))`, `border: var(--border-glass)`, `box-shadow: var(--shadow-dock)`); brand logo at the LEFT (`src={BRAND_LOGO}`, `alt="ALPIERCING logo"`, `object-fit: contain`, `height: 32px`, `mix-blend-mode: screen`) + the nav links; static (no `client:`), wraps at 320px (FR-003/004/005)

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - The icon/logo appears consistently across surfaces (Priority: P2)

**Goal**: The logo is the favicon/mobile icon, appears in the admin header and small in the footer.

**Independent Test**: Inspect head icons, `/admin` header and the footer mark (quickstart S4/S5/S6).

### Implementation for User Story 3

- [x] T007 [P] [US3] Edit the `<head>` of src/layouts/BaseLayout.astro — add `<link rel="icon" type="image/png" href={BRAND_LOGO} />` and `<link rel="apple-touch-icon" href={BRAND_LOGO} />` (keep the existing favicon.svg/ico) (FR-006)
- [x] T008 [US3] Edit src/components/admin/AdminPanel.svelte — panel-head shows the logo (`src={BRAND_LOGO}`, ~32px, `object-fit: contain`) beside the title **"ALPIERCING Admin"** (replacing "Panel del Estudio"); mode badge, email and `[Cerrar Sesión]` stay (FR-007)
- [x] T009 [P] [US3] Edit src/components/Footer.astro — add a small logo (≈20px, `BRAND_LOGO`, `mix-blend-mode: screen`, `object-fit: contain`) inline with the FORGE Labs attribution paragraph (FR-008)

**Checkpoint**: All icon surfaces complete

---

## Phase 6: User Story 4 - Primary and secondary buttons follow the Dark Gold system (Priority: P3)

**Goal**: Primary CTAs use the gold style and secondary CTAs use the translucent style, with the
specified hovers; pills (nav/FAB/slots/badges) keep the pill radius.

**Independent Test**: On public pages verify primary/secondary resting + hover; confirm pills
unchanged (quickstart S7/S8).

### Implementation for User Story 4

- [x] T010 [P] [US4] Apply `.btn-primary` to the hero CTAs in src/pages/index.astro — `.cta-primary`: `background: var(--accent-primary)`, `color: var(--accent-on)`, `font-weight: 600`, `border-radius: var(--radius-btn)`, hover `transform: translateY(-1px)` + `box-shadow: var(--glow-btn-primary)` (FR-009)
- [x] T011 [P] [US4] Apply the primary style to the submit button (`.submit`) in src/components/booking/BookingFlow.svelte (gold fill, dark text, `--radius-btn` 12px, hover elevation + `--glow-btn-primary`) (FR-009)
- [x] T012 [P] [US4] Apply the primary style to the checkout/selected payment controls in src/components/catalog/CartDrawer.svelte — `.checkout` and `.pay-opt.active` (gold fill, dark text, `--radius-btn`, hover glow) (FR-009)
- [x] T013 [P] [US4] Apply the primary style to Admin `.primary` buttons in src/components/admin/AdminPanel.svelte and src/components/admin/AdminCalendar.svelte (gold fill, dark text, `--radius-btn` 12px, hover elevation + `--glow-btn-primary`) (FR-009)
- [x] T014 [US4] Apply the secondary style (`.btn-secondary`) to index `.cta-secondary`, CartDrawer clear/pay-opt inactive, AdminPanel `.ghost` and AdminCalendar `.ghost` — `background: var(--bg-btn-secondary)`, `border: var(--border-btn-secondary)`, `border-radius: var(--radius-btn)`, hover `border: var(--border-btn-secondary-hover)` (FR-010)
- [x] T015 [US4] Verify pill exclusions remain `--radius-pill` (9999px): nav links, floating cart FAB, calendar slot pills, status badges/toggles (contract §6) (FR-012)

**Checkpoint**: All user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T016 [P] a11y/responsive/token pass — no raw hex/rgba outside `src/styles/tokens.css`; dock wraps at 320px; targets ≥ 44px; visible focus; logo and capsule have plain fallbacks when blur/blend are unsupported (FR-012/SC-005, quickstart S9/S10)
- [x] T017 [P] Update docs — README.md and design-system.md to note the brand icon asset (`/images/logo.png`), the public dock and the button system
- [x] T018 Run final validation against quickstart.md S1–S10 plus `npx astro check` and `npm run build` at repository root — all MUST pass with zero errors and zero warnings (FR-013/SC-006)
- [x] T019 Commit the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — `BaseLayout` route check
- **US2 (P2)**: After Foundational — `AppHeader` rework (independent file)
- **US3 (P2)**: After Foundational — touches `BaseLayout` head + `AdminPanel` + `Footer` (three files)
- **US4 (P3)**: After Foundational — button styles across five files

### Within Each User Story

- `BaseLayout.astro` is touched by US1 (T005) and US3 (T007) — sequential within those phases
- AdminPanel is touched by US3 (T008) and US4 (T013/T014) — sequential

### Parallel Opportunities

- Setup T002; Foundational T004; US3 T007/T009; US4 T010–T013 (one file each) can run in parallel
- Do NOT parallelize the secondary-button pass (T014) with the primary passes that share files

---

## Parallel Example: Foundational + Public Surfaces

```bash
# After T003:
Task: "Extend src/lib/config.ts (BRAND_LOGO, ADMIN_PREFIX)"          # T004
Task: "Edit BaseLayout head (favicon PNG + apple-touch)"             # T007
Task: "Edit Footer (small logo near FORGE Labs)"                     # T009
Task: "Primary buttons on index CTAs"                                # T010
Task: "Primary buttons on BookingFlow submit"                        # T011
Task: "Primary buttons on CartDrawer checkout"                       # T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (tokens + constants)
3. Complete Phase 3: User Story 1 (hide public nav on `/admin`)
4. **STOP and VALIDATE**: quickstart S1; `astro check` + `npm run build`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → tokens/constants ready
2. Add US1 → test S1 → demo (MVP!)
3. Add US2 → test S2/S3 → demo
4. Add US3 → test S4–S6 → demo
5. Add US4 → test S7/S8 → demo
6. Polish → S9/S10 + gates

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: Developer A owns US1/US2 (nav); Developer B owns US3 (icon
   surfaces) + US4 primary buttons; Developer C owns US4 secondary pass + polish
3. Stories remain independently testable via quickstart S1–S8

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to its user story for traceability
- Each user story is independently completable and testable (quickstart S1–S8)
- Test tasks intentionally omitted — not requested in the spec (validation via quickstart gates)
- Contract constraints (token values, `max-width: 650px`, `top/margin-top: 1rem`, `mix-blend-mode:
  screen`, `--radius-btn` 12px for buttons only, pill exclusions) are quoted verbatim and MUST NOT
  change at implementation time
- The logo asset is `public/images/logo.png` (NOT `icon.png`); reference it via `BRAND_LOGO`
- Commit after each task or logical group; stop at any checkpoint to validate the story independently