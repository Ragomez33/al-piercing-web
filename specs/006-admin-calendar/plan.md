# Implementation Plan: Interactive Admin Calendar

**Branch**: `006-admin-calendar` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-admin-calendar/spec.md`

## Summary

Add a large interactive weekly calendar as the admin's default agenda view (`/admin?tab=calendar`),
replacing the flat bookings list. A **custom CSS-grid calendar** (no FullCalendar dependency) renders
appointments as duration-proportional blocks (solid dark + gold border for `CONFIRMED`, translucent
for `PENDING`), with a detail modal (`[Confirmar Seña]`, `[Reagendar]`, `[Cancelar Cita]`) and manual
time blocking. Blocks also disable those slots in the public booking form. Backed by an extended
`DataStore` (new `time_blocks` storage + `updateBookingSchedule`).

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5 (runes)

**Primary Dependencies**: No new runtime dependency — the calendar is a **custom CSS grid + absolute
positioning** (rejects FullCalendar, see `research.md` §1). Existing: `@supabase/supabase-js`,
`lucide-svelte`.

**Storage**: Extends the hybrid data layer. **Demo**: `localStorage` key `alpi:timeblocks:v1`.
**Production**: new Supabase table `time_blocks` (migration `0003_time_blocks.sql`). Bookings keep
their table/storage.

**Testing**: `astro check` (0/0) + `astro build` + manual scenarios in `quickstart.md`. No test framework.

**Target Platform**: Modern evergreen browsers on static hosting; mobile-first.

**Project Type**: Web application (static pages + justified Svelte islands).

**Performance Goals**: Renders one week's bookings/blocks with a single data pass; no animation
overhead; calendar scrolls internally (no page-level layout thrash).

**Constraints**: Token-only Dark/Gold styling (new `--divider-subtle` token); slot exclusivity holds
across bookings **and** blocks; public booking must see blocks as unavailable; admin writes stay
authenticated (RLS); components delegate to `src/lib/data/store.ts` only.

**Scale/Scope**: Admin only (calendar tab replaces the bookings list); plus the public `BookingFlow`
reads blocked slots. No other pages change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands**: PASS. The calendar is composed **inside** the existing
  `AdminPanel` island via a child `AdminCalendar.svelte` (no new `client:` island); public pages keep
  their current hydrate set.
- **Principle II — Token-Driven Styling**: PASS. All new styles consume `tokens.css`; one new token
  (`--divider-subtle: rgba(255, 255, 255, 0.05)`) is added first (Design Parity).
- **Principle III — Type-Safe by Default**: PASS. `TimeBlock`/`BlockInput` typed under
  `src/lib/types/domain.ts`; `DataStore` grows with `listBlocks`, `createBlock`, `deleteBlock`,
  `updateBookingSchedule`, `getBlockedSlots`; adapter rows narrowed; no `any`.
- **Principle IV — Booking & Financial Integrity**: PASS. Money stays integer cents; slot exclusivity
  reinforced across active bookings **and** manual blocks; status transitions still go through the
  store.
- **Principle V — Mobile-First, Accessible**: PASS. Calendar scrolls horizontally inside its
  container at 320px; click targets are tap-friendly; modal labeled, focus, ≥ 44px.
- **Data Access rule**: PASS. `AdminCalendar` and `BookingFlow` only call `dataStore`; Supabase stays
  in `src/lib/data/adapters/`.

No new gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-admin-calendar/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── admin/
│       ├── AdminPanel.svelte          # EDIT: tabs = calendar (default) | catalog; removes flat list
│       └── AdminCalendar.svelte       # NEW: weekly grid, event blocks, modal actions, block create
├── components/booking/BookingFlow.svelte  # EDIT: availability = bookings ∪ blocks
├── lib/
│   ├── types/domain.ts                # EDIT: TimeBlock, BlockInput; DataStore additions
│   ├── data/
│   │   ├── store.ts                   # unchanged facade wiring
│   │   └── adapters/
│   │       ├── local.ts               # EDIT: time_blocks (demo) + updateBookingSchedule
│   │       └── supabase.ts            # EDIT: time_blocks (prod) + updateBookingSchedule
│   └── utils/calendar.ts              # NEW: week range, minute math, overlap/availability helpers
└── styles/tokens.css                  # EDIT: --divider-subtle
supabase/migrations/0003_time_blocks.sql  # NEW: time_blocks table + RLS
.env.example / README / design-system.md # EDIT (docs)
```

**Structure Decision**: The calendar is a sub-component of the single `AdminPanel` island (no extra
hydration). Grid layout, positioning and availability math live in framework-agnostic
`src/lib/utils/calendar.ts` so they stay unit-testable. `time_blocks` joins the hybrid storage the
same way `bookings`/`products` already do.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no violations. The calendar replaces the flat list per the spec's explicit "reemplace la
lista plana de citas"; all financial and exclusivity rules keep their existing guarantees.

**Post-Design Re-check (after Phase 1)**: PASS — `data-model.md`, contracts and `quickstart.md`
confirm: duration-proportional geometry, CONFIRMED/PENDING card rules, modal actions, manual blocks
excluding slots in the public form, RLS (public read of blocks, authenticated insert/delete), and
token-only styling with `--divider-subtle`.