# Phase 0 Research: Team Members Module, Monthly Admin Calendar & Mobile UX

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-09 · **Phase**: 0 (Outline & Research)

All `Technical Context` unknowns are resolved below. No `NEEDS CLARIFICATION` remainders.

## R1. Team entity & type placement

- **Decision**: Add `TeamMember` and `NewTeamMemberInput` to `src/lib/types/domain.ts` (next to
  `Booking`, `TimeBlock`); keep the demo seed as a static collection in a new `src/lib/data/team.ts`.
  Domain fields are camelCase; SQL columns are snake_case, mapped in the Supabase adapter.
- **Rationale**: The constitution says domain entities live under `src/lib/types/` and static data
  collections under `src/lib/data/`. Unlike `PiercingService` (which predates that split), team is a new
  entity, so it should start on the correct side of the line and avoid the documented tension in feature
  011.
- **Alternatives considered**: Co-locating the type with the seed in `data/team.ts` (mirrors
  `services.ts` but puts a domain entity outside `src/lib/types/`); a separate `src/lib/types/team.ts`
  (unnecessary file for one entity).

## R2. Hybrid data-layer operations

- **Decision**: Extend the `DataStore` interface (`src/lib/types/domain.ts`) with:
  - `listTeamMembers(input?: { includeInactive?: boolean }): Promise<TeamMember[]>`
  - `createTeamMember(input: NewTeamMemberInput): Promise<TeamMember>`
  - `updateTeamMember(id: string, patch: Partial<NewTeamMemberInput> & { isActive?: boolean }): Promise<TeamMember>`
  - `deleteTeamMember(id: string): Promise<void>`
  The local adapter stores an array under `alpi:team:v1` (seeded from `data/team.ts`); the Supabase adapter
  reads/writes `public.team_members` through the shared typed client.
- **Rationale**: Mirror exactly how `services`/`products` are handled, so admin/landing code follows a
  known, reviewable pattern. `includeInactive` lets the public section show only active members while the
  admin shows everyone (identical to `listServices`).
- **Alternatives considered**: A dedicated `TeamStore` — rejected (the unified `DataStore` is the
  constitution's single data surface).

## R3. Schema: migration `0006_team_members.sql`

- **Decision**: New table
  `public.team_members(id uuid primary key default gen_random_uuid(), name text not null, role text not
  null, avatar_url text not null default '', bio text not null default '', instagram_handle text not null
  default '', is_active boolean not null default true, created_at timestamptz not null default now())`.
  Enable RLS; policies: `select` public where `is_active = true`; `select` authenticated (all);
  `insert`/`update`/`delete` authenticated. Explicit grants to `anon, authenticated, service_role`.
  **No production seed** (the studio adds its own team); the demo `localStorage` seed covers offline/dev.
- **Rationale**: Matches the `services`/`products` RLS model (public read, authenticated write). A UUID PK
  matches the catalog identity style. `role`/`bio`/`instagram_handle` are free text (no fixed enum).
- **Alternatives considered**: Enum `role` — rejected (roles are free-form titles); a boolean `deleted`
  column — rejected (hard delete is explicit in the spec, R4); seeding fake artists in production —
  rejected (would publish placeholder people).

## R4. Activate/deactivate vs. delete

- **Decision**: Support **both**: soft visibility via `is_active` (`updateTeamMember(id, { isActive })`)
  and a **hard delete** (`deleteTeamMember(id)`) with a confirmation step in admin.
- **Rationale**: The spec (FR-008/FR-009) requires both. No table references team members, so delete is a
  clean removal (no FK side effects).
- **Alternatives considered**: Soft-delete-only — rejected (spec explicitly asks for delete).

## R5. Avatar upload (reuse Storage)

- **Decision**: Generalize `src/lib/services/storage.ts` so the upload path is
  `uploadImage(file, { prefix })` (production uploads to the public `products` bucket with a
  `team-<timestamp>-<uuid>.<ext>` name; demo returns a data URL). Keep `uploadProductImage` as a thin
  wrapper so the existing product flow is unchanged. Expose it to the admin team form; components never
  touch Supabase directly.
- **Rationale**: The request explicitly asks to reuse the existing upload/Storage path; a generalized
  helper avoids duplicating FileReader/Storage logic and keeps the "single place components may upload"
  rule. Namespaced prefixes keep the shared bucket tidy.
- **Alternatives considered**: A separate `avatars` bucket (more migration/policy surface, no functional
  gain); inlining the file in the component (violates the data-access rule).

## R6. Landing "Nuestro Equipo / Artistas" section

- **Decision**: A new `src/components/team/TeamSection.svelte` island mounted with **`client:visible`**
  in `src/pages/index.astro`. On mount it calls `dataStore.listTeamMembers()` (active only) and renders
  Dark-Luxury cards (avatar with placeholder fallback, name, role, bio, Instagram link when a handle
  exists). It shows a small skeleton while loading, renders nothing (section hidden) when there are no
  active members, and, on a read failure, falls back to the demo seed served by the data layer
  (`listFallbackTeamMembers()`) with a non-blocking notice.
- **Rationale**: Because the landing is a static build, a build-time read could not satisfy SC-002
  ("deactivating removes the member within one reload"). A below-the-fold island hydrates on view, keeps
  the section off the critical path, and reflects admin edits on the next visit — matching the
  `CatalogGrid` client-refresh pattern.
- **Alternatives considered**: Build-time SSR read like the landing service menu (stale until rebuild —
  fails SC-002); `client:load` (unnecessary above-the-fold cost since the section is below the hero).

## R7. Admin "Equipo" tab (CRUD UI)

- **Decision**: Add a fourth sidebar section/tab `Equipo` to `AdminPanel.svelte` (icons from
  `lucide-svelte`, e.g. `Users`), following the **Inventario/Servicios** patterns: toolbar + "Nuevo
  miembro" button, inline rows (avatar thumb, name, role, active toggle), a create/edit modal
  (name*, role*, bio, Instagram, avatar file with preview) and a delete confirmation (`role="alertdialog"`).
  `?tab=team` deep-links the tab like the others. Validation errors surface in a `role="alert"`.
- **Rationale**: Consistency with the existing admin UX and token reuse; no new routing.
- **Alternatives considered**: A separate `/admin/team` route — rejected (routing/shell churn; the spec
  wants a section like the others).

## R8. Monthly calendar (desktop ≥768px)

- **Decision**: Replace the weekly time-matrix in `AdminCalendar.svelte` with a **custom monthly grid**
  (no library): month pager (`‹ Mes Año ›`), a Monday–Sunday weekday header, and 42 day cells (6×7) that
  mark non-current-month days. Each in-month cell shows the day number plus **status badges** (total
  count pill and pending/confirmed/cancelled dots). Clicking a day selects it and reveals a **day-detail**
  region listing that day's appointments (client, service, time, status) and time blocks, each opening
  the existing booking detail modal with the approve/cancel/reschedule actions. A "Nuevo bloqueo"
  affordance on the selected day preserves manual blocking.
- **Rationale**: A month-at-a-glance is the requested operator value (SC-004). The month grid is simpler
  geometry than the week time-matrix (no pixel positioning) and removes the horizontal-scroll pain.
  Reusing `src/lib/services/booking.ts` keeps the transition boundary intact (Principle 4).
- **Alternatives considered**: A calendar library (bundle + theme interop, rejected); keeping the weekly
  matrix with monthly navigation (does not deliver the month overview).

## R9. Calendar mobile (<768px): day strip + vertical list

- **Decision**: Below 768px the grid is replaced by a **horizontally scrollable day selector** for the
  month (day chips, today/selected highlighted) and, below it, a **vertical list** of the selected day's
  appointments with a clear service breakdown (service name, time, client, status, notes) and the same
  actions; time blocks appear in the list with a delete action. The page never scrolls horizontally; the
  strip scrolls internally via `overflow-x: auto`. Selected day defaults to today (or the first day of the
  month if today is out of view).
- **Rationale**: FR-014/SC-005 — a time×day matrix cannot compress to 320px; a day strip + list is the
  requested mobile pattern and avoids table overflow.
- **Alternatives considered**: Keeping a horizontally scrolling full grid on mobile (the feature
  explicitly asks to avoid it); collapsing to a single-day carousel without a list (loses the service
  breakdown).

## R10. Calendar math & data

- **Decision**: Extend `src/lib/utils/calendar.ts` with month helpers (`startOfMonth`, `addMonths`,
  `monthLabel`, `monthGrid` → 42 `MonthDayCell { date, dayNumber, inMonth, isToday }`, and
  `dayStatusSummary(bookings, date) → { total, pending, confirmed, cancelled }`). The component still
  loads **all** bookings + blocks + service durations in one pass and filters by month/day client-side.
  The reschedule slot list reuses the existing `buildOccupancies`/`isBusy`/`calendarRows` helpers. Weekly
  geometry helpers that become unused may be pruned.
- **Rationale**: Framework-agnostic, unit-testable math in one module (feature 006 precedent). One data
  pass keeps the month render cheap (Performance Goals).
- **Alternatives considered**: Adding a per-month query to the data layer (extra API surface for no
  measurable gain at this scale); computing summaries inside the component (not reusable/testable).

## R11. Public header mobile drawer

- **Decision**: Add `src/components/ui/MobileNav.svelte` (`client:load`) that renders a hamburger button
  (hidden ≥768px) and an off-canvas drawer with the `NAV_ITEMS` links. `AppHeader.astro` keeps the brand
  and the desktop nav (hidden <768px) and mounts the island. The drawer closes on link selection,
  Escape, and backdrop click; it moves focus into the panel on open and restores it to the toggle on
  close; body scroll is locked while open. Uses `--overlay-backdrop`, `--z-overlay`/`--z-modal`,
  `--bg-navbar-glass` and pill tokens.
- **Rationale**: FR-015 — the current wrapping nav is awkward on phones. A dedicated island is the
  constitution-correct way to add behavior; the reference admin drawer (feature 010) provides the
  accessibility pattern.
- **Alternatives considered**: CSS-only `<details>` menu (limited focus/animation control); inline
  `<script>` (violates the islands rule).

## R12. Catalog / cart / booking overflow fixes

- **Decision**: Small-screen hardening only (no behavior change): ensure `box-sizing: border-box` globally
  in `tokens.css`; use `min-width: 0` on grid/flex children, `overflow-wrap: anywhere` (or `break-word`)
  on names/bios, `clamp()`-based paddings, `width: min(<max>, 100%)` for the cart drawer, and 100%-width
  controls in the booking form. Product card `+` and cart quantity controls keep ≥44px targets.
- **Rationale**: FR-016/SC-005/SC-007 — remove horizontal scroll at 320px without touching logic or
  tokens (reuse existing design tokens).
- **Alternatives considered**: Hiding elements on small screens (loses content); a utility framework
  (forbidden).

## R13. Generated Supabase types

- **Decision**: Hand-update `src/types/supabase.ts` with the `team_members` `Row`/`Insert`/`Update`/
  `Relationships` block mirroring the SQL (no access token available to regenerate).
- **Rationale**: Schema Control requires types to reflect the schema before UI wiring; the typed client
  then returns typed rows without casts.
- **Alternatives considered**: Regenerating via the Supabase CLI (no token here); leaving it untyped
  (casts/`any` forbidden).

## R14. Verification gates

- **Decision**: The change must pass `npx astro check` (zero errors — explicit user requirement),
  `npm run build` and `npm run lint`, plus the `quickstart.md` scenarios. Existing booking/calendar/
  catalog/services journeys must keep working.
- **Rationale**: SC-003/SC-006 and the constitution's type-safety gate.
- **Alternatives considered**: None — hard gate.
