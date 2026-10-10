# Phase 0 Research: Landing V2 UX Overhaul, Copy Alignment & Admin Loading States

**Feature**: `015-landing-v2-ux-overhaul` | **Date**: 2026-10-10

All `NEEDS CLARIFICATION` items from the Technical Context are resolved below. Each decision is a
**Decision / Rationale / Alternatives considered** record grounded in the current repository.

---

## R1 — Continuous scroll + sticky sidebar (replacing tabs)

**Decision**: Realize the single-page layout with native anchor links and CSS only:
- Section wrappers carry ids: `#servicios`, `#equipo`, `#acerca-de`, `#galeria`, `#resenas`, `#direccion`.
- Smooth scrolling via `html { scroll-behavior: smooth }`, reset under
  `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`.
- Desktop grid `grid-template-columns: minmax(0, 1fr) 340px` with `align-items: start`; the right card
  uses `position: sticky; top: <header-height>`.
- Below the `768px` breakpoint the grid collapses to one column and the card flows after the content.

**Rationale**: The top-bar links become plain `<a href="#id">` elements (no JS, deep-linkable, keyboard
usable, crawlable). Setmore's profile is exactly this pattern. CSS `scroll-behavior` is honored by all
target browsers and trivially disabled for reduced motion (constitution Principle V).

**Alternatives considered**: JS click handlers with `scrollIntoView` (rejected: redundant JS, must
re-implement focus/offset handling); IntersectionObserver scroll-spy to highlight the active link
(deferred as optional polish — not required by the spec, adds an island budget).

---

## R2 — Replace the tab island with two column-scoped islands

**Decision**: Delete `src/components/landing/LandingV2Tabs.svelte` and create:
- `LandingV2Services.svelte` (`client:load`) — grouped collapsible service list (accordion), each row
  with duration, price, a "Requiere adelanto" badge and a `/booking?service=<id>` action; subscribes
  to live service changes.
- `LandingV2Sidebar.svelte` (`client:load`) — avatar/logo, live open status + closing time, address,
  rating/reviews, and the "Reservar mi cita" CTA.

The reused `TeamSection.svelte` (`client:visible`) fills the `#equipo` section. The static shell
(`landing-v2.astro`) renders the anchor nav, policy banner, About, Gallery and Address/Contact.

**Rationale**: Keeps static content server-rendered (Principle I) and confines each island to a small,
single-purpose region. The accordion is a native `<details>/<summary>` (or a button + `aria-expanded`)
so it is keyboard-accessible without extra JS state, while the island owns only data + live refresh.

**Alternatives considered**: One island for the whole page (rejected: inlines static content, larger
payload); keeping tabs (rejected: contradicts FR-001/FR-002).

---

## R3 — Anchor set, section order and the "Reseñas" anchor

**Decision**: Nav links `Servicios · Equipo · Acerca de · Galería · Reseñas · Dirección` map to
`#servicios`, `#equipo`, `#acerca-de`, `#galeria`, `#resenas`, `#direccion`. Left-column content order
matches the spec: policy banner → Servicios → Equipo → Acerca de → Galería → Dirección/Contacto.
Because the spec's left-column order has no separate reviews section, the reviews block lives in the
**right sticky card** (rating + short testimonials) and carries `id="resenas"`; the nav link smooth-scrolls
to it (on mobile the card flows after the content, so the jump still resolves).

**Rationale**: Resolves the only anchor that had no matching left-column section without introducing
an unrequested section, while keeping all six nav labels functional and deep-linkable.

**Alternatives considered**: Adding a seventh left-column section (rejected: the spec fixes the section
order); dropping the link (rejected: the nav list is explicit).

---

## R4 — Reviews/rating content source

**Decision**: No review entity exists today. Introduce **static, curated content** in
`src/lib/types/content.ts`:
- `STUDIO_RATING: { value: number; count: number }` (aggregate rating + review count),
- `STUDIO_REVIEWS: Review[]` (2–4 short testimonials with author + optional text).
These feed the sidebar card's rating and the `#resenas` block. No admin CRUD or DB table is added.

**Rationale**: The spec's Assumptions scope reviews to curated/aggregate content without new authoring
workflows; this is the smallest change that satisfies FR-005's "rating/reviews indicator". It is trivial
to swap for a data-backed source later.

**Alternatives considered**: New `reviews` table + admin CRUD (rejected: large scope the request did
not ask for); omit reviews entirely (rejected: FR-005 requires the indicator).

---

## R5 — Real-time synchronization mechanism

**Decision**: Add a read-side subscription capability to the data layer, split into a dedicated module:
- `src/lib/data/realtime.ts` exports **`subscribeToDataChanges(channels, listener): () => void`** where
  `channels` is an array of `"services" | "team" | "products"`; `listener` receives a
  `DataChangeEvent { resource; origin }`.
- **Publish**: the shared `dataStore` is wrapped so that successful `create*/update*/delete*` calls emit
  a change event for their resource (components never publish directly).
- **Transport (demo)**: `BroadcastChannel("alpi:data")`, with a `window` `storage` listener as a
  fallback for browsers/contexts without `BroadcastChannel` (localStorage writes fire `storage` in
  other same-origin tabs).
- **Transport (production)**: Supabase Realtime `postgres_changes` on `services`, `team_members`
  (and `products` only if a consumer needs it) via the existing shared client. If Realtime is not
  enabled the channel simply never fires — no error.
- **Fallback**: every subscriber also re-checks on `visibilitychange`/`focus`, so returning to the tab
  refreshes even when Realtime is unavailable.
- **Consume**: `LandingV2Services` and `TeamSection` subscribe on mount, re-fetch the affected
  resource, and **patch state in place** (no full teardown), unsubscribing on destroy.

The user-facing name referenced in the request (`subscribeToProductChanges`) is generalized to
`subscribeToDataChanges` so one API covers services, team and products.

**Rationale**: Works identically for the localStorage demo adapter and the Supabase production
adapter; event-driven and zero-cost when idle; keeps all data access inside the data layer
(constitution "Data Access"). Deployment of Supabase Realtime is a publication toggle, not a schema
change.

**Alternatives considered**: Interval polling (rejected: background traffic, delayed updates);
`window` custom events only (rejected: do not cross browser tabs/pages); Supabase-only subscriptions
(rejected: demo mode would not update).

---

## R6 — Open/closed status and closing time

**Decision**: Add `src/lib/utils/hours.ts` with a pure, typed helper:
`getOpenStatus(hours: StructuredHours, now: Date): { open: boolean; label: string; nextChange: string }`.
Hours become structured data (per-weekday open/close), derived from the existing configured schedule
(`BUSINESS_OPENING_HOURS = "Mo-Sa 11:00-20:00"`), exposed via a small constant in `config.ts`
(e.g. `BUSINESS_HOURS`). The sidebar renders "Abierto • Cierra a las 20:00" or "Cerrado • Abre a las 11:00".

**Rationale**: A pure helper is unit-testable by inspection, keeps the island lean, and centralizes the
single source of truth for hours (currently duplicated as the literal `OPENING_HOURS` in
`landing-v2.astro`). "Now" is inherently client-side, so this belongs in the sidebar island.

**Alternatives considered**: Static "Abierto" text (rejected: FR-005 wants the next closing time);
server-time rendering (rejected: the page is statically built, so the value would be stale).

---

## R7 — Deposit terminology and normalization

**Decision**: Canonical term is **"Adelanto"**; **"Apartado"** is an accepted synonym where it reads
better (spec Assumptions). Replace every user-facing occurrence of "Seña"/"seña". Exhaustive targets
found in the repo:
- `src/lib/types/content.ts` — `PROCESS_STEPS[1]` title `"Reserva con Seña (50%)"` → `"Reserva con Adelanto (50%)"`;
  description `"...el 50% de la seña."` → `"...el 50% del adelanto."`.
- `src/pages/index.astro` — hero CTA `"Reservar Turno (50% Seña)"` → `"Reservar mi cita"`; services row `"Requiere seña"` → `"Requiere adelanto"`; `"Reservar mi turno"` → `"Reservar mi cita"`.
- `src/pages/booking.astro` — meta description and hero paragraph `"seña del 50%"` → `"adelanto del 50%"`; title/heading `"Reservar Turno"` → `"Reservar mi cita"`.
- `src/components/booking/BookingFlow.svelte` — `"Requiere seña"` → `"Requiere adelanto"`; `"Seña a abonar (50%)"` → `"Adelanto a abonar (50%)"`; `"Datos para abonar la seña"` → `"Datos para abonar el adelanto"`; submit `"Solicitar turno"` → `"Solicitar cita"`.
- `src/components/admin/AdminCalendar.svelte` — `"Seña (50%)"` → `"Adelanto (50%)"`.
- `src/components/admin/AdminPanel.svelte` — `"Requiere seña"` → `"Requiere adelanto"`.
- `src/components/landing/LandingV2Tabs.svelte` — removed with the tab island (rebuilt without the term).

**Rationale**: A single canonical term plus an accepted synonym matches the user's request literally.
The deposit math (`calcDepositCents`, integer cents) is untouched.

**Alternatives considered**: A single term only (rejected: the request explicitly allows both);
"Depósito" (rejected: not requested).

---

## R8 — Location: "El Tigre, Anzoátegui"

**Decision**: Update **both** location sources:
- `src/lib/types/content.ts` → `STUDIO_PROFILE.location = "El Tigre, Anzoátegui"`.
- `src/lib/config.ts` → `BUSINESS_ADDRESS` defaults: `addressLocality = "El Tigre"`,
  `addressRegion = "Anzoátegui"`, and `addressCountry = "VE"` (Anzoátegui is in Venezuela, so the
  previous `"MX"` default would be inconsistent). Both remain env-overridable via `PUBLIC_BUSINESS_*`.
- `src/pages/index.astro` → meta description "…en CDMX…" → "…en El Tigre, Anzoátegui…".

The request names `STUDIO_PROFILE` "in `src/lib/config.ts`"; in this repo `STUDIO_PROFILE` lives in
`types/content.ts` and the address constants live in `config.ts`, so both are updated to fully remove
"CDMX / Ciudad de México".

**Rationale**: Removes every user-visible and structured-data trace of the old location; keeps one
consistent source for display (`STUDIO_PROFILE`) and SEO (`BUSINESS_ADDRESS`).

**Alternatives considered**: Only change `STUDIO_PROFILE` (rejected: the JSON-LD/SEO address would
still say CDMX); leave country as "MX" (rejected: inconsistent with a Venezuelan city/state).

---

## R9 — Admin non-flicker list updates

**Decision**: Keep lists mounted and patch them in place:
- Introduce per-list `hasLoaded` flags; the "Cargando…" placeholder renders **only on first load**
  (`!hasLoaded`). Subsequent loads never swap the whole list.
- Replace `await refreshX()` after a mutation with a local update from the mutation's return value:
  - create → append the returned record;
  - update/toggle → replace the matching item with the returned record (clear its draft);
  - delete → filter the item out after the promise resolves.
- Per-row transient states already exist (`svBusy`, `saving`, `tmBusy`, `deleting`); reuse them to
  show an inline busy/disabled state on the affected row. On failure, keep the previous data and show
  the existing inline error (`servicesError`, `productsError`, `teamError`).
- The full-refresh helpers remain for the initial tab load only (`switchTab`, auth bootstrap).

**Rationale**: The flicker is caused precisely by `xLoading = true` folding the `{#if xLoading}` block
and replacing the list with a placeholder on every mutation. Patching from the returned record removes
the round-trip and the DOM swap, satisfying FR-016–FR-019. It also removes a redundant network call.

**Alternatives considered**: Keep the re-fetch behind a skeleton (rejected: still swaps the DOM and
adds a request); optimistic removal before confirmation (rejected: FR-018 requires keeping prior data
on failure, so the row is only removed after the promise resolves).

**Note — no product delete today**: `DataStore` exposes `updateProduct` but **no** `deleteProduct`, and
the admin catalog has no delete action. "Product" handling therefore covers stock edits, publish
toggles and creation; no new delete method is added (the spec's "deleting … products" is satisfied by
the services/team delete flows that do exist). This is recorded so implementation does not invent an
unsupported operation.

---

## R10 — Landing V1 team parity

**Decision**: `src/pages/index.astro` already imports and mounts `<TeamSection client:visible />`
(line 3 / line 116). Keep it in place and verify it renders active members (or the empty state). The
only related change is the additive subscription inside `TeamSection.svelte` (R5), which benefits both
landings.

**Rationale**: No functional gap exists; the requirement is satisfied by preserving the current mount
and confirming behavior in `quickstart.md`.

**Alternatives considered**: Re-implementing a separate team block on V1 (rejected: duplicates the
component and diverges from the shared data source).

---

## R11 — WhatsApp / email copy surfaces

**Decision**: Update the WhatsApp message builders in `src/lib/utils/booking.ts`
("Confirmamos tu turno" → "Confirmamos tu cita") and the cart builder in `src/stores/cart.ts` (no
"seña"/"turno" copy to change; verified). The repo contains **no customer-facing email templates** —
only Supabase auth emails (login), which are outside this feature's copy scope. UI badges, tooltips and
form labels are covered in R7.

**Rationale**: Ensures the phrase "turno" is consistent ("cita") across the booking lifecycle without
touching authentication.

**Alternatives considered**: Introduced a shared copy dictionary (rejected: over-engineering for a
one-time correction; existing strings are inline and Spanish-only).
