# Phase 0 Research: Managed Service Catalog (Admin CRUD + Booking)

All `Technical Context` unknowns are resolved below. No `NEEDS CLARIFICATION` remainders.

## R1. Service entity & type placement

- **Decision**: Extend the existing `PiercingService` interface in `src/lib/data/services.ts` with a new
  `active: boolean` field, and add a `NewServiceInput` interface (no `id`/`active`) for creation. The
  categories stay the fixed union `"NOSTRIL" | "HELIX" | "NAVEL" | "TITANIO"`.
- **Rationale**: `PiercingService` is already the shared type imported by both adapters, `BookingFlow`,
  `AdminCalendar` and `utils/booking.ts`. Adding the flag in place is a tiny, low-risk change; moving it
  to `src/lib/types/` would be a broad refactor with no behavioral gain (documented in Complexity
  Tracking).
- **Alternatives considered**: (a) Move the type to `src/lib/types/domain.ts` — rejected (churn, risk);
  (b) introduce a parallel `Service` type — rejected (violates "single shared type").

## R2. Hybrid data-layer operations

- **Decision**: Extend the `DataStore` interface (in `src/lib/types/domain.ts`) with:
  - `listServices(input?: { includeInactive?: boolean }): Promise<PiercingService[]>`
  - `createService(input: NewServiceInput): Promise<PiercingService>`
  - `updateService(id: string, patch: Partial<NewServiceInput> & { active?: boolean }): Promise<PiercingService>`
  The local adapter stores an array under `alpi:services:v1` (seeded with the current menu); the Supabase
  adapter reads/writes `public.services` through the shared typed client.
- **Rationale**: Mirrors exactly how `products` are handled (`listProducts`/`createProduct`/
  `updateProduct` with `includeUnpublished`), so admin/booking code follows a known pattern and no new
  abstraction is invented. `includeInactive` lets the admin see everything while the public menu filters
  to `active` (or queries only active rows).
- **Alternatives considered**: A new `ServiceStore` interface — rejected (the unified `DataStore` is the
  constitution's single data surface).

## R3. Schema: migration `0008_services.sql`

- **Decision**: New table
  `public.services(id text primary key, name text not null, category text not null check (category in
  ('NOSTRIL','HELIX','NAVEL','TITANIO')), description text not null default '', price_cents integer not
  null check (price_cents >= 0), duration_minutes integer not null check (duration_minutes > 0),
  requires_deposit boolean not null default true, active boolean not null default true, created_at
  timestamptz not null default now())`. RLS enabled; policies: `select` public where `active = true`;
  `select` authenticated (all); `insert`/`update` authenticated. The migration seeds the current six
  services with `on conflict (id) do nothing` (idempotent).
- **Rationale**: Matches the `products` RLS model (public read, authenticated write) and keeps money as
  integer cents. The seed makes production start equal to today's menu.
- **Alternatives considered**: A JSON column on a generic table — rejected (no type safety, poor
  queryability); hard delete policy — rejected (soft deactivation is the model, R4).

## R4. Deactivate vs. delete

- **Decision**: Implement **soft deactivation** via the `active` flag (`updateService(id, { active })`).
  No hard delete is exposed.
- **Rationale**: Bookings store a service snapshot; hard-deleting a referenced service adds no value and
  risks confusing the admin. The spec asks for activate/deactivate.
- **Alternatives considered**: Hard delete — rejected (history + referential safety).

## R5. Booking flow: load active services with fallback

- **Decision**: `BookingFlow.svelte` loads services via `dataStore.listServices()` (active only) in
  `onMount`, showing a short "Cargando servicios…" state and an empty state when none are active. If the
  read **fails**, it falls back to the seed `PIERCING_SERVICES` (filtered to active) and shows a
  non-blocking notice (FR-011/FR-012). The `?service=` deep link is resolved **after** the list loads.
- **Rationale**: Mirrors `CatalogGrid` (async load + fallback, never a blank screen) and keeps the
  selected service's price/deposit/duration driven by managed data (FR-010).
- **Alternatives considered**: Keeping the constant — rejected (defeats the feature); blocking on error —
  rejected (breaks the public flow).

## R6. Booking slot duration from managed data

- **Decision**: `AdminCalendar.svelte` stops importing the constant for durations; it loads the service
  list once (including inactive, since bookings may reference a deactivated service) and builds an
  `id → durationMinutes` map with a `30` fallback.
- **Rationale**: Durations must reflect admin edits (FR-010). Including inactive avoids losing the
  duration of a booking whose service was deactivated.
- **Alternatives considered**: Re-resolve per booking — rejected (unnecessary queries).

## R7. Admin "Servicios" section (CRUD UI)

- **Decision**: Add a third section to the `AdminPanel` sidebar nav (`Servicios`) that renders a list of
  services (name, category, price, duration, active state) and a form/modal to create or edit, following
  the **Inventario** patterns (toolbar + "Nuevo" button, inline rows, modal form, `role="alert"` errors,
  busy/disabled states). Activate/deactivate via a toggle like `published`.
- **Rationale**: Consistent UX and reuse of the `.input`/`.field`/card tokens; the sidebar already
  supports active-state sections (feature 010).
- **Alternatives considered**: A separate route — rejected (routing/shell churn; the spec wants a section
  like the others).

## R8. Demo vs. production selection & fallback semantics

- **Decision**: Reuse the existing mode resolution (`resolveMode()`/`isSupabaseConfigured()`): with no
  backend → localStorage demo store (seeded); with a backend → real table. Additionally, on a **read
  error** in production, fall back to the seed menu (FR-012) so the menu is never blank.
- **Rationale**: Exactly the behavior requested ("modo demo si la db no responde o da error"). Writes in
  production still surface errors and are not optimistically applied.
- **Alternatives considered**: Silent empty list on error — rejected (bad UX, contradicts the request).

## R9. Generated Supabase types

- **Decision**: Hand-update `src/types/supabase.ts` to include the `services` table (`Row`/`Insert`/
  `Update`/`Relationships`), mirroring the SQL, since no access token is available to regenerate.
- **Rationale**: Schema Control requires types to reflect the schema before UI wiring; the typed client
  then returns typed rows without casts.
- **Alternatives considered**: Regenerating with the CLI — not possible here (no token); leaving it
  untyped — rejected (`any`/casts forbidden).

## R10. UI state handling & accessibility

- **Decision**: Loading hint (`aria-live`), empty state, and error alerts; form validation messages in a
  `role="alert"`; all controls ≥44px with visible focus; transitions honor `prefers-reduced-motion`; no
  horizontal scroll 320–1920px.
- **Rationale**: Principle V and FR-015.
- **Alternatives considered**: None — accessibility is a hard requirement.

## R11. Verification gates

- **Decision**: The change must pass `npx astro check` (zero errors — explicit user requirement),
  `npm run build` and `npm run lint`, plus the `quickstart.md` scenarios. Existing booking/calendar/
  catalog journeys must keep working.
- **Rationale**: FR-016/SC-004/SC-006.
- **Alternatives considered**: None — hard gate.
