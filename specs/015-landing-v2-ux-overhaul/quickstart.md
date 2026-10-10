# Quickstart Validation: Landing V2 UX Overhaul, Copy Alignment & Admin Loading States

**Feature**: `015-landing-v2-ux-overhaul` | **Date**: 2026-10-10

Runnable validation for the end-to-end behavior. References the contracts instead of duplicating them.
Implementation details (bodies, migrations, tests) live in `tasks.md` and the implementation phase.

## Prerequisites

- Node `>=22.12.0`, dependencies installed (`npm install`).
- Demo mode (default) needs no backend: the data layer uses browser `localStorage`.
- Optional production mode: set `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` (admin actions).

## Setup & commands

```bash
npm install
npm run dev          # local site (default: http://localhost:4321)
npm run check        # npx astro check — MUST pass with 0 errors
npm run build        # static build MUST succeed
npm run lint
```

Change the admin screenshot target: `/admin` (requires Supabase config in production mode; in demo mode
the admin gate shows the "not configured" notice).

## Automated gate

- `npx astro check` (explicit user requirement) → **0 errors, 0 warnings-as-errors, no type discrepancies**.
- `npm run build` → succeeds; `/landing-v2` and `/` are emitted.

## Scenario 1 — Continuous profile + sticky card (FR-001, FR-003, FR-005)

1. Open `/landing-v2` at a desktop width (≥ 1024px).
2. Confirm **no tabs**; the content is one continuous page with the order: policy banner → Servicios →
   Equipo → Acerca de → Galería → Dirección.
3. Scroll: the **right card stays pinned**, showing avatar, `Abierto/Cerrado • …`, `El Tigre, Anzoátegui`,
   the rating/reviews and a **"Reservar mi cita"** button.
4. Confirm the card has **no Instagram/WhatsApp** links (FR-006).

Expected: single-scroll layout; sticky card always visible on desktop.

## Scenario 2 — Anchor navigation (FR-002)

1. From the top bar, activate each of `Servicios`, `Equipo`, `Acerca de`, `Galería`, `Reseñas`, `Dirección`.
2. Each link smooth-scrolls to its section; the URL hash updates (`#servicios`, `#equipo`, …).
3. Load `/landing-v2#galeria` directly → the view opens at the gallery.

Expected: all six anchors resolve; smooth scroll; enabled (reduced-motion users see an instant jump).

## Scenario 3 — Services accordion + booking (FR-004.2, FR-008)

1. In `#servicios`, expand/collapse categories — operable by mouse and keyboard.
2. Confirm each row shows duration, price and a "Requiere adelanto" badge when applicable.
3. Activate a service's booking action → `/booking?service=<id>` opens with the service pre-selected.

Expected: grouped, collapsible, keyboard-accessible list; booking pre-selects the service.

## Scenario 4 — Copy & location (FR-012…FR-015)

1. Search the repo for `Seña`, `seña`, `CDMX`, `Ciudad de México`, `Reservar mi turno`, `Reservar Turno`.
2. Confirm no user-facing matches remain (only spec/plan/contract docs quote the old terms).
3. On `/`, `/booking`, `/landing-v2` and in `BookingFlow`, confirm the deposit reads
   "Adelanto"/"Apartado", the location reads "El Tigre, Anzoátegui", and primary CTAs read
   "Reservar mi cita".
4. Inspect the JSON-LD address on any page → `El Tigre / Anzoátegui / VE`.

Expected: consistent terminology everywhere; deposit math unchanged (50%).

## Scenario 5 — Live synchronization (FR-009, FR-010)

1. Open `/landing-v2` in tab A; open `/admin` in tab B (production mode with an authenticated session).
2. In tab B, add/edit/deactivate a service and a team member.
3. Return to tab A (or leave it focused): the Services accordion and/or Team section update **without a
   manual reload**, in place (no scroll jump).
4. Simulate an unavailable transport (block Realtime / disconnect): tab A keeps the last known content
   and focuses-refetch still applies.

Expected: content refreshes within ~5 s; failures are non-blocking.

## Scenario 6 — Flicker-free admin mutations (FR-016…FR-019)

1. In `/admin` (services tab), delete a service and edit another.
2. Observe: the list **never blanks/flashes**; the affected row shows an inline busy state; the row is
   removed/updated only after the promise resolves.
3. Force a failure (e.g., offline) on a delete → the row remains and an inline error appears.
4. Perform several rapid deletions → the list stays stable (no duplicated/missing rows).

Expected: no full-list teardown at any point; errors preserve prior data. Same for catalog (stock/publish)
and team tabs.

## Scenario 7 — Team parity on V1 (FR-011)

1. Open `/`.
2. Confirm the "Nuestro Equipo" section renders active members with name/role (or the elegant empty
   state when none exist), consistent with `/landing-v2#equipo`.

Expected: both landings show the team section from the same data source.

## Scenario 8 — Responsive & accessibility (FR-020)

1. At 320px, 768px, 1440px and 1920px: no horizontal scroll.
2. All controls ≥ 44×44px; keyboard focus is visible; async regions announce via `aria-live`.
3. Enable `prefers-reduced-motion`: smooth scroll, skeleton shimmer and hover transforms are suppressed.

Expected: compliant at every width; reduced-motion honored.
