# Implementation Plan: Disponibilidad, Horarios Laborales y Bloqueos Avanzados

**Branch**: `017-availability-schedule-blocks` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-availability-schedule-blocks/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Implement the **robust availability system** end-to-end:

1. **Data layer**: two new persisted tables via `supabase/migrations/0008_availability_blocks.sql` —
   `availability_blocks` (range-based: `start_datetime`, `end_datetime`, `reason`, `is_full_day`) and
   `studio_schedule` (one row per weekday: `is_open`, `open_time`, `close_time`), both RLS-guarded
   (public SELECT, authenticated writes). The legacy `time_blocks` table (0003) is left intact and its
   rows are copied into equivalent ranges. The domain gets `AvailabilityBlock`/`NewAvailabilityBlockInput`
   (replacing `TimeBlock`) and `StudioScheduleDay`/`StudioSchedule`; the hand-maintained
   `src/types/supabase.ts` gains both tables; both adapters + local seeds (`alpi:availabilityblocks:v1`,
   `alpi:studioschedule:v1`) implement the new surface; `store.ts` adds `listFallbackSchedule()`.
2. **Admin (`?tab=schedule`)**: a new `AdminSchedule.svelte` island with a **weekly schedule editor**
   (open/closed per weekday + open/close times, inline validation) and an **advanced block manager**
   (time-range and full-day-range modes, motivo, active-block list with confirmed delete) — all
   flicker-free (feature-015 pattern). `AdminCalendar` drops its fixed-slot block modal and renders blocks
   as read-only day info; reschedule uses the schedule-aware engine. Collision warning (FR-011) is
   non-blocking.
3. **Strict booking engine**: a pure `src/lib/utils/availability.ts` engine
   (`buildFreeSlots` / `isSlotFree`) fed by a domain service `getDayAvailability` (schedule + bookings +
   blocks). `BookingFlow` renders only free slots and `submitBookingRequest` re-validates before
   persisting, throwing **"Este horario ya no se encuentra disponible"**; the persistent duplicate-slot
   race maps to the same message.
4. **Realtime**: `DataResource` gains `"blocks"`, `"bookings"` and `"schedule"`; the Supabase channel
   tracks `availability_blocks`, `bookings` and `studio_schedule`; `store.ts` publishes after the relevant
   mutations; `BookingFlow` subscribes and refetches availability live.

No payment/money changes. No new dependencies.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes: `$state`, `$derived`, `$effect`); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**No new dependencies** (the engine is a pure TS module; the admin editor is an island).

**Storage**: Reuses the hybrid data layer (`src/lib/data/store.ts` → `dataStore`): Supabase Postgres
(production) / browser `localStorage` (demo). Adds **two new tables** via migration `0008` and two new
demo keys; the legacy `time_blocks` table is kept but no longer read.

**Testing**: `npx astro check` (type gate, **zero errors** — explicit user requirement), `npm run build`,
`npm run lint`, plus the manual scenarios in `quickstart.md`. The project has no unit-test runner (the
pure availability engine is written framework-agnostic so it stays unit-testable later).

**Target Platform**: Static web (`output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: 60fps; the booking island refreshes only the current day's slots on realtime events
(debounced, in place, no reload/scroll jump); the admin editor patches rows in place; no full-list
teardown.

**Constraints**: No Tailwind; token-driven styling + scoped CSS (`design-system.md` is binding). Data
access only via `dataStore` / domain services (`src/lib/services/*`); migrations follow the numbered
0001–0008 style; `src/types/supabase.ts` must gain both new tables by hand; `astro check` zero errors;
unrelated routes/behavior untouched. Time handling stays device-local (`localISODate`/`HH:mm`).

**Scale/Scope**: Single-studio site; daily slot volume is small (tens of slots/day). Scope = one
migration, two domain type additions + one replacement, two supabase.ts table blocks, two adapter
extensions (+ seeds/guards), one realtime extension (3 resources + channel), one availability engine +
domain service, one new admin island + tab wiring, AdminCalendar consolidation, BookingFlow rework,
docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `.specify/memory/constitution.md` (v1.0.0); `design-system.md` is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS | Shells stay static; one **new** island (`AdminSchedule`) owns the schedule/blocks editor; `BookingFlow` and `AdminCalendar` remain existing islands. No full-page app, no new runtimes. |
| II. Token-Driven Styling (Zero Tailwind) | PASS | New UI consumes existing tokens only (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`, `--shadow-glow`, `--accent-negative`); no raw hex in components. |
| III. Type-Safe by Default | PASS | `AvailabilityBlock`/`StudioScheduleDay` are explicit shared types with validated inputs; `supabase.ts` mirrors both migrations; no `any`; guarded adapter mappers; `astro check` is the gate. |
| IV. Booking & Financial Integrity | PASS | Slot exclusivity preserved (DB partial index + re-validation + unified "no longer available" message); no money math touched; availability computation lives in the domain service, not in components. |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | 320–1920px with no horizontal scroll, ≥44px targets, labeled controls, `role="switch"` for open/closed, confirmed deletes, reduced-motion honored, flicker-free admin (in-place patching). |
| Data Access (Workflow) | PASS | Islands call `dataStore`/domain services only; components never read the engine/store directly for availability — they call `getDayAvailability`; no direct Supabase access from `.svelte`/`.astro`. |
| Schema Control (Workflow) | PASS | Both new tables expressed as migration `0008` and mirrored in `src/types/supabase.ts` before UI integration; demo parity via local-adapter seeds. |
| Design Parity (Workflow) | PASS | `design-system.md` and `README.md` are updated to document the Horarios/Bloqueos module. |

**Gate result**: PASS with no unjustified violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| I. Islands | PASS | Design pins exactly one new island (`AdminSchedule`) plus adapting `BookingFlow`/`AdminCalendar`; the availability engine is a pure lib module, not UI. |
| II / V | PASS | Contracts forbid raw values, require in-place mutations ≥44px targets, switch semantics and reduced-motion handling. |
| III / Schema | PASS | Contracts pin both tables + domain types + supabase.ts keys; `astro check` remains the gate; all external reads are narrowed by guards/mappers. |
| IV | PASS | The booking guard re-validates availability in the domain service (never in the component) and unifies the race/block message; slot exclusivity stays constitutional. |
| Data Access | PASS | `getDayAvailability` service is the only availability entry point for islands; the legacy `time_blocks` table is read nowhere in `src/`. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/017-availability-schedule-blocks/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify)
├── research.md          # Phase 0 output (R1–R11)
├── data-model.md        # Phase 1 output (entities, DataStore ops, engine)
├── quickstart.md        # Phase 1 output (8 validation scenarios)
├── contracts/           # Phase 1 output
│   ├── availability-data-contract.md
│   ├── admin-schedule-ui-contract.md
│   └── booking-availability-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
supabase/migrations/0008_availability_blocks.sql   # NEW: availability_blocks + studio_schedule + copy

src/
├── types/
│   ├── supabase.ts                                # MODIFY: + availability_blocks, studio_schedule tables
│   └── domain.ts                                  # MODIFY: + AvailabilityBlock, NewAvailabilityBlockInput,
│                                                  #          StudioScheduleDay/Schedule; − TimeBlock/NewBlockInput;
│                                                  #          DataStore surface
├── lib/
│   ├── data/
│   │   ├── schedule.ts                            # NEW: DEFAULT_SCHEDULE_SEED (local demo seed)
│   │   ├── adapters/local.ts                      # MODIFY: alpi:availabilityblocks:v1 + alpi:studioschedule:v1,
│   │   │                                          #          guards, CRUD, duplicate-slot message
│   │   ├── adapters/supabase.ts                   # MODIFY: toAvailabilityBlock/toStudioScheduleDay, both tables,
│   │   │                                          #          23505 → "Este horario ya no se encuentra disponible"
│   │   ├── realtime.ts                            # MODIFY: DataResource += blocks|bookings|schedule + channel
│   │   └── store.ts                               # MODIFY: publish picks + listFallbackSchedule()
│   ├── services/
│   │   ├── availability.ts                        # NEW: getDayAvailability(date, durationMinutes)
│   │   └── booking.ts                             # MODIFY: re-validate + "Este horario ya no se encuentra disponible"
│   └── utils/
│       ├── availability.ts                        # NEW: pure engine (isSlotFree/buildFreeSlots/resolveSlotInterval)
│       └── calendar.ts                            # MODIFY: adapt buildOccupancies to range blocks (or retire for slot lists)
├── components/
│   ├── admin/AdminSchedule.svelte                 # NEW: weekly schedule editor + block manager (client:load island)
│   ├── admin/AdminPanel.svelte                    # MODIFY: AdminTab += "schedule", sidebar + ?tab=schedule wiring
│   ├── admin/AdminCalendar.svelte                 # MODIFY: drop fixed-slot block modal; read-only block rows; engine reschedule
│   └── booking/BookingFlow.svelte                 # MODIFY: getDayAvailability; live subscribe(["blocks","bookings","schedule"])
design-system.md                                    # MODIFY: document Horarios/Bloqueos admin module
README.md                                           # MODIFY: tabs/tables/structure updates
```

**Structure Decision**: Single-project Astro/Svelte layout, consistent with 006/009/011/012/015/016. The
domain change reuses the `domain.ts` + dual-adapter pattern; the admin tab is a sibling island to
`AdminCalendar` (keeps `AdminPanel.svelte` lean); the availability engine is a pure lib module consumed
only by a domain service so booking, reschedule and admin share one source of truth; `BookingFlow`
consumes the service (constitution "Data Access").

## Complexity Tracking

> Deviations from the constitution that are justified here.

**None** — no constitution violations. Deliberate trade-offs:

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| New `availability_blocks` + `studio_schedule` tables instead of altering `time_blocks`. | Non-destructive, reversible evolution of a schema that may be live; one homogeneous range shape; legacy data copied, not destroyed. | `ALTER`/reuse of `time_blocks` (destructive/reversible risk), a JSON schedule blob (no integrity/RLS). |
| AdminCalendar stops creating blocks; management moves to the Horarios tab. | One UI per model — the fixed-slot modal would silently bypass the range model and split state. Calendar row stays informative (read-only). | Keeping both UIs (split state, two paths to one table). |
| Availability engine duplicated nowhere: one pure module + one domain service for public flow, reschedule and the submit guard. | Booking, reschedule and guard need identical rules; components stay data-access-free. | Inline intersection in `BookingFlow` (drift, un-testable). |
| Full-day blocks stored as one row with `is_full_day` (no explosion into daily rows). | Matches the spec's `is_full_day` flag and keeps the admin list tidy; the engine computes coverage. | Expanding every full-day range into per-day rows at write time (rejected: more rows, loss of the original range). |