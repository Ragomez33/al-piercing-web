# Quickstart Validation: Managed Service Catalog (Admin CRUD + Booking)

End-to-end validation for the managed service menu. Details live in [contracts/](./contracts/) and
[data-model.md](./data-model.md).

## Prerequisites

- Node `>=22.12.0`, npm. Install deps: `npm install`.
- **Demo mode** (default): no env vars needed.
- **Production mode** (optional): set `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY`, apply migration
  `0008_services.sql` (`supabase db push`), and sign in at `/admin`.

## Setup / commands

```bash
npm run dev       # http://localhost:4321 (booking: /booking; admin: /admin?tab=services)
npx astro check   # type gate — MUST be 0 errors (explicit user requirement)
npm run build     # static build MUST succeed
npm run lint      # eslint MUST be clean
```

## Scenarios

### S1 — Public menu loads managed services (US2)
1. Open `/booking`.
2. **Expected**: the service list loads (brief "Cargando servicios…" then the cards) showing name,
   category, description, duration and price; only active services appear.
   (booking-menu-contract §1/§2)

### S2 — Select and book with managed data (US2)
1. Select a service and continue the flow.
2. **Expected**: the summary price, 50% deposit and slot duration match that service; submitting still
   persists the request and shows the success panel unchanged.

### S3 — Admin Servicios list (US1)
1. Sign in and open `/admin`, choose **Servicios**.
2. **Expected**: all services are listed with name, category, price (cents → formatted), duration and
   active state; `?tab=services` is reflected. (admin-services-ui-contract §1/§2)

### S4 — Create a service (US1)
1. Activate **Nuevo Servicio**, fill valid fields (name, category, description, price in cents, duration,
   require deposit) and submit.
2. **Expected**: the modal closes, the service appears in the list and — on visiting `/booking` — in the
   public menu. (admin-services-ui-contract §3, SC-001)

### S5 — Edit a service (US1)
1. Edit an existing service (e.g., change price/duration) and save.
2. **Expected**: the list reflects the change and `/booking` shows the updated price/duration on next
   load. (SC-002)

### S6 — Deactivate / reactivate (US1/US4)
1. Deactivate a service in admin.
2. **Expected**: it stays visible (inactive) in admin but is **absent** from `/booking`; reactivating it
   brings it back to the public menu. (SC-003)

### S7 — Validation errors (US1)
1. Try to submit with an empty name, a non-integer/negative price, or a duration ≤ 0.
2. **Expected**: a clear `role="alert"` message is shown and nothing is persisted.
   (admin-services-ui-contract §6)

### S8 — Demo mode persistence (US3)
1. Run without backend configuration; create/edit a service in admin; reload the page.
2. **Expected**: changes persist locally (`alpi:services:v1`) and the booking menu reflects them.
   (SC-005)

### S9 — Fallback on backend failure (US3)
1. In production mode, force the services query to fail (e.g. unreachable DB).
2. **Expected**: `/booking` still shows a usable menu (seed fallback) with a non-blocking notice rather
   than a blank list. (booking-menu-contract §3)

### S10 — Empty catalog (edge)
1. Deactivate all services.
2. **Expected**: `/booking` shows an elegant empty state; admin still lists them as inactive and can
   reactivate. (booking-menu-contract §1)

### S11 — Regressions & gates (FR-016)
1. Re-run prior journeys: booking submit + success panel, admin calendar approve/cancel/reschedule
   (durations still correct), catalog/cart.
2. Run `npx astro check`, `npm run build`, `npm run lint`.
3. **Expected**: all journeys unchanged; **0 errors**, clean lint, successful build.

## Exit criteria

- All scenarios pass.
- `npx astro check` → **0 errors** (explicit user requirement).
- `npm run build` and `npm run lint` succeed.
- No new `client:*` directives; no Tailwind; money stays integer cents; `PiercingService`/`DataStore`
  remain the shared types.
