# Research: Admin Dashboard, Bookings & Hybrid Data Layer

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 0 (Outline & Research)

## 1. Environment Detection & Mode Selection

- **Decision**: `src/lib/data/store.ts` reads `import.meta.env.PUBLIC_SUPABASE_URL` and
  `import.meta.env.PUBLIC_SUPABASE_ANON_KEY` once at module init. If **both** are non-empty it
  selects the Supabase adapter (`production`); otherwise it selects the local adapter (`demo`). The
  resolved `DataMode` is exposed as a readonly value for UI badges and debugging.
- **Rationale**: Astro inlines `PUBLIC_*` variables at build time on the client; a single check keeps
  every module backend-agnostic and makes demo vs production a configuration concern, not a code
  change (FR-001/FR-002).
- **Alternatives considered**: A build flag per environment (more moving parts); runtime probing of
  the network (slow, unreliable).

## 2. Unified Data API Surface

- **Decision**: The facade exposes a small async API so both adapters share one shape:
  `getMode()`, `listServices()`, `listProducts({ includeUnpublished })`, `createProduct(input)`,
  `updateProduct(id, patch)`, `listBookings({ date? })`, `createBooking(input)`,
  `updateBookingStatus(id, status)`, `getBookedSlots(date)`.
- **Rationale**: Async everywhere means the local adapter can evolve into a remote one without
  touching callers. Components depend only on this surface (constitution Data Access rule).
- **Alternatives considered**: Synchronous local API + async remote (leaks mode into callers —
  rejected).

## 3. Demo Adapter (localStorage)

- **Decision**: Versioned keys `alpi:bookings:v1` and `alpi:products:v1`. On first read, if a key is
  absent it is seeded from `PIERCING_SERVICES`/`PRODUCTS`. Writes replace the whole array under the
  key. All reads parse JSON and narrow through a validator (`isBooking`/`isProductRecord`) — corrupt
  entries are dropped, never trusted.
- **Rationale**: Simple, dependency-free, survives reloads (FR-018) and gives instant demos (US4).
- **Alternatives considered**: IndexedDB (overkill for this volume); `sessionStorage` (loses data on
  tab close, contradicting persistence).

## 4. Production Adapter (Supabase)

- **Decision**: Use `@supabase/supabase-js` with the anon key. Tables:
  - `bookings(id uuid pk, created_at timestamptz, client_name text, client_whatsapp text,
    service_id text, service_name text, price_cents int, deposit_cents int, date date, time_slot text,
    status text, notes text)`.
  - `products(id text pk, name text, category text, price_cents int, stock int, image text,
    published boolean)`.
  Row payloads are mapped to domain types at the adapter boundary; errors surface as thrown
  `DataError` values. Only public reads/writes are used (no server secrets).
- **Rationale**: Matches the requested environment variables; anon-key access keeps the static site
  backend-agnostic; the provider stays isolated in one file.
- **Alternatives considered**: Raw REST `fetch` (fine but more code); server routes (requires an SSR
  adapter that the project doesn't use).

## 5. Slot Availability & Exclusivity

- **Decision**: `getBookedSlots(date)` returns the `time_slot` values whose booking status is
  `PENDING` or `CONFIRMED` for that date; `CANCELLED` is ignored. `BookingFlow` merges these with the
  deterministic agenda and disables occupied slots.
- **Rationale**: Implements FR-004/FR-005 and the spec's explicit "block PENDING and CONFIRMED"
  requirement. This is a **conscious deviation** from constitution §IV ("pending deposits never block
  a slot"), justified in `plan.md` (Complexity Tracking) to prevent double-booking during the
  WhatsApp/deposit window.
- **Alternatives considered**: Blocking only `CONFIRMED` (constitution-literal but allows the
  double-booking the client asked to avoid).

## 6. Admin PIN Gate

- **Decision**: A PIN (`PUBLIC_ADMIN_PIN`, default `1234` in `config.ts`) is compared in the
  `AdminPanel` island; on success a flag is written to `sessionStorage` (`alpi:admin:unlocked`) and
  the panel renders. The flag is cleared when the browser session ends; a "Lock" action clears it.
- **Rationale**: Matches FR-010 and the requested `1234`/`sessionStorage` behavior; a simple gate for
  a single-operator panel, not real authentication.
- **Alternatives considered**: Supabase auth (out of scope — no user accounts requested); cookie
  session (needs a server).

## 7. WhatsApp Number & Deposit Payment Details

- **Decision**: `PUBLIC_WHATSAPP_PHONE` overrides `WHATSAPP_PHONE` from `src/lib/config.ts` (fallback
  placeholder). Payment details (Pago Móvil phone/ID and Binance Pay ID) are new config constants
  with documented placeholder defaults shown in the confirmation summary.
- **Rationale**: FR-007/FR-008/FR-009; keeps the number and payment data in one place and out of
  components.
- **Alternatives considered**: Hardcoding in the island (breaks the token/config discipline).

## 8. Image Input for New Products

- **Decision**: The add-product modal captures an **image reference (path/URL string)** with a
  preview and falls back to `/images/products/placeholder.svg` when empty or broken.
- **Rationale**: Upload/storage is out of scope for this skeleton; a reference keeps the data layer
  storage-agnostic and works in both modes.
- **Alternatives considered**: Supabase Storage upload (requires bucket setup + auth — deferred).

## 9. Islands & Hydration

- **Decision**: `AdminPanel` and `CatalogGrid` are `client:load` islands; `BookingFlow` gains the
  same data reads/writes. `CatalogGrid` server-renders the static `PRODUCTS` as a no-JS fallback and
  replaces them on mount from the store.
- **Rationale**: Principle I — interactivity stays in leaf islands; dynamic data can only be read in
  the browser for a static build.
- **Alternatives considered**: Full SSR/hybrid rendering (needs an adapter and a reachable backend at
  build time — rejected).

## 10. Testing & Validation

- **Decision**: Keep the existing gates (`astro check`, `astro build`) plus the manual
  `quickstart.md` scenarios. Adapter logic is written as pure functions where possible to keep it
  unit-testable later.
- **Rationale**: The project has no test framework (consistent with specs 001–003); adding Vitest is
  scope creep for this skeleton.
- **Alternatives considered**: Installing Vitest for the adapters (revisit when the data layer
  stabilizes).

## 11. Date & Time Handling

- **Decision**: Dates are stored/compared as local ISO `yyyy-mm-dd` strings; times as `HH:mm` strings
  within the fixed agenda (11:00–19:30, 30-min steps). A small `dates.ts` helper produces "today" in
  the device timezone.
- **Rationale**: Avoids UTC off-by-one day bugs already observed in the booking flow; string dates
  are directly Supabase `date` values.
- **Alternatives considered**: `Date` objects in state (serialization/tenancy bugs).

## Design-Token Note

All admin/catalog/booking UI MUST use `tokens.css`: charcoal surfaces (`--bg-app-body` `#111113`,
`--bg-card-light` `#1A1A1E`, `--bg-surface-elevated` `#242429`), neon-gold accent (`--accent-primary`
`#E5A93C`), gold glow (`--shadow-glow`), and the existing status tokens
(`--accent-positive/gold/negative`). Any new color/radius MUST be added to `tokens.css` first
(Design Parity).
