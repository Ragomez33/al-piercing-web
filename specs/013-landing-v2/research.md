# Phase 0 Research: Alternative Setmore-Style Landing Page (Dark Luxury)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-09 · **Phase**: 0 (Outline & Research)

All `Technical Context` unknowns are resolved below. No `NEEDS CLARIFICATION` remainders.

## R1. Page architecture (static shell + one island)

- **Decision**: `src/pages/landing-v2.astro` renders the profile header and section wrapper as **static
  Astro markup**, then mounts a single Svelte island `src/components/landing/LandingV2Tabs.svelte`
  (`client:load`) that owns the tab state and the tab panels. The current `index.astro` is not touched.
- **Rationale**: Matches the constitution's "static-first + islands" model. The profile header is static
  content (no interaction), so it stays server-rendered; only the tab navigation and its panels need
  JavaScript. One island keeps the hydration budget minimal.
- **Alternatives considered**: A fully Svelte page (extra hydration for static content, violates the
  island model); duplicating the header inside the island (unnecessary JS for text).

## R2. Tabs implementation & accessibility

- **Decision**: Implement the tabs as an accessible tab widget: `role="tablist"` with `role="tab"`
  buttons (`aria-selected`, `aria-controls`, `id`) and `role="tabpanel"` panels (`aria-labelledby`,
  `hidden` when inactive). Support keyboard navigation (Left/Right/Home/End) with focus management and
  a roving `tabindex`. Default tab: **Servicios**.
- **Rationale**: FR-006/FR-012 require a labeled, keyboard-operable control with a clear active state.
  Native buttons + ARIA tabs are semantic and need no library.
- **Alternatives considered**: Radio-group/filter pattern (less conventional for full content panels);
  a third-party headless tab library (new dependency, forbidden by the zero-dependency constraint).

## R3. Service data source (client-side vs build-time)

- **Decision**: The island loads services on mount via `dataStore.listServices()` (active only) and, on
  failure, falls back to `listFallbackServices()`, showing a non-blocking notice — exactly like
  `BookingFlow`/`CatalogGrid`.
- **Rationale**: SC-005 ("operator changes reflect without a code change or redeploy"). The current
  landing reads services at build time, which is stale until a rebuild; a client read reflects admin
  edits on the next visit and reuses the existing store/fallback pattern.
- **Alternatives considered**: Build-time read like `index.astro` (fails SC-005); a new per-page query
  (extra API surface for no gain).

## R4. Booking action

- **Decision**: Each service row's "Reservar" is an anchor to `/booking?service=<id>`, which the existing
  `BookingFlow` already consumes to pre-select the service (`onMount` reads the `service` query param).
- **Rationale**: FR-005 + the spec's stated default; works without JS, preserves the static build, and
  reuses the existing booking deep-link (`index.astro` uses the same href). Avoids embedding a second
  booking wizard on the page.
- **Alternatives considered**: Inline booking wizard inside the tab (duplicates `BookingFlow`, heavier
  hydration, and would need its own state) — explicitly listed as an acceptable-but-not-default option.

## R5. Reusing the public team section

- **Decision**: Import `src/components/team/TeamSection.svelte` as a **child component** of the tabs
  island and render it inside the "Equipo" panel.
- **Rationale**: The panel must toggle synchronously; a child component keeps one hydration and reuses
  all the existing team logic (active-only fetch, skeleton, fallback notice, empty state, responsive
  cards). No duplication.
- **Alternatives considered**: A second `client:visible` island toggled by CSS (extra hydration +
  cross-island coordination); re-implementing team cards (duplication).

## R6. Profile header content sources

- **Decision**: Drive the header from existing sources — `STUDIO_PROFILE` (`brand`, `tagline`, `bio`,
  `location`), `BRAND_LOGO` and `WHATSAPP_PHONE`. The opening hours and the Instagram URL are small
  **page-local constants** in `landing-v2.astro` (mirroring `Footer.astro`, which already hardcodes the
  Instagram URL). Social links follow the footer pattern (`Instagram` + `https://wa.me/<phone>`).
- **Rationale**: No new shared content/type surface is justified for a single experimental page; keeps
  the feature self-contained and avoids touching `content.ts`/`config.ts` used by other pages.
- **Alternatives considered**: Extending `StudioProfile` with `hours`/`instagramUrl` (touches a shared
  entity for one page); a new config constant (possible future consolidation, out of scope now).

## R7. Optional tab deep-linking

- **Decision**: Do **not** require URL persistence, but read a `?tab=` query param on mount and mirror
  the active tab back to the URL with `history.replaceState` as a low-cost enhancement (same pattern as
  `AdminPanel`). If absent, default to Servicios.
- **Rationale**: The spec marks deep-linking as optional; the mirror is cheap and makes the tab
  shareable without adding routing.
- **Alternatives considered**: No URL sync (simplest, spec-compliant); full route segments
  (`/landing-v2/servicios`) — unnecessary routing surface for a client-side toggle.

## R8. Responsive, tokens & touch targets

- **Decision**: All spacing uses `clamp()`; the layout is single-column on mobile and widens on desktop;
  tab buttons and service/booking controls keep ≥44px targets; content never causes page-level
  horizontal scroll (the long text wraps with `overflow-wrap: anywhere`; member/photo grids use
  `minmax(0, 1fr)`). `prefers-reduced-motion` disables tab transitions.
- **Rationale**: FR-010/FR-012 and Principle V; the 012 feature established the same responsive
  conventions.
- **Alternatives considered**: Fixed paddings (overflow at 320px); a utility framework (forbidden).

## R9. Error handling & empty states

- **Decision**: Services: show a loading hint, a `role="alert"` on unexpected failure, a `role="status"`
  non-blocking notice when using the demo fallback, and an elegant empty state when there are no active
  services. Team: reuse `TeamSection`'s existing fallback/empty behavior. Process/Gallery: static, with
  `data-fallback` placeholder images.
- **Rationale**: FR-013 and the spec's edge cases; keeps the page usable when the backend is down.
- **Alternatives considered**: Blank panel on error (rejected by FR-013).

## R10. Verification gates

- **Decision**: The change MUST pass `npx astro check` (zero errors — explicit user requirement),
  `npm run build` and `npm run lint`, plus the `quickstart.md` scenarios. Existing journeys (current
  landing, catalog/cart, booking, admin) MUST remain intact.
- **Rationale**: SC-002/SC-004 and the constitution's type-safety gate.
- **Alternatives considered**: None — hard gate.
