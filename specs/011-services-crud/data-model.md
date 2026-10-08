# Phase 1 Data Model: Managed Service Catalog (Admin CRUD + Booking)

## Entity: Service (PiercingService)

The studio's bookable menu item. Type: `PiercingService` in `src/lib/data/services.ts` (extended by this
feature with `active`).

| Field | Type | Rules |
|-------|------|-------|
| `id` | `string` | Unique, stable slug (e.g. `nostril`). PK. |
| `name` | `string` | Required, non-empty (trimmed length ≥ 1). |
| `category` | `"NOSTRIL" \| "HELIX" \| "NAVEL" \| "TITANIO"` | Required; must be one of the fixed set. |
| `priceCents` | `integer` | Required, ≥ 0 (integer cents — never float). |
| `durationMinutes` | `integer` | Required, > 0. |
| `description` | `string` | Required (may be empty string but defaults non-empty). |
| `requiresDeposit` | `boolean` | Required; default `true`. |
| `active` | `boolean` | **NEW**; default `true`. Public visibility flag. |

### Creation input: `NewServiceInput`

```ts
interface NewServiceInput {
  name: string;
  category: PiercingServiceCategory;
  priceCents: number;   // integer ≥ 0
  durationMinutes: number; // integer > 0
  description: string;
  requiresDeposit: boolean;
}
```

The `id` is generated on insert (slug from the name or a UUID fallback) by the adapter.

### Category info

`PIERCING_SERVICE_CATEGORIES` (`{ id, label, description }`) remains the presentation source for the
fixed category set; it is not part of the CRUD (categories are fixed).

## State: active / inactive

```
create (admin)  ───────────────►  active = true
                                     │
                    deactivate (admin)│ activate (admin)
                                     ▼
                                  active = false   (hidden from public booking menu,
                                                    still visible/manageable in admin)
```

- Public booking lists **only** `active = true` services (FR-003).
- Admin lists **all** services with their state (FR-004).
- Deactivation is **soft** (no hard delete; R4).

## Persistence constraints

- `category` constrained to the fixed set.
- `price_cents >= 0`, `duration_minutes > 0` enforced at the DB (migration `0008`).
- `active boolean not null default true`, `requires_deposit boolean not null default true`.
- RLS: public `SELECT` `where active = true`; authenticated `SELECT` (all) / `INSERT` / `UPDATE`.
- Demo adapter enforces the same validation before writing to `localStorage` (`alpi:services:v1`).

## Validation rules (all layers)

| Rule | Where | Failure behavior |
|------|-------|------------------|
| `name` non-empty | Admin form + adapter | Submit blocked / `DataError` "El nombre es obligatorio". |
| `category` in fixed set | Adapter/DB check | Rejected (`DataError`). |
| `priceCents` integer ≥ 0 | Admin form + DB check | Rejected with a clear message. |
| `durationMinutes` integer > 0 | Admin form + DB check | Rejected with a clear message. |
| `id` unique | Adapter/DB PK | Insert error surfaced; no optimistic change. |
| Only active services publicly | Store query / RLS | Inactive services absent from the menu. |

## DataStore operations (interface extension)

```ts
listServices(input?: { includeInactive?: boolean }): Promise<PiercingService[]>;
createService(input: NewServiceInput): Promise<PiercingService>;
updateService(
  id: string,
  patch: Partial<NewServiceInput> & { active?: boolean },
): Promise<PiercingService>;
```

- `listServices()` (no options) → active only (public).
- `listServices({ includeInactive: true })` → all rows (admin).

## Derived/consumed projections

- **Public menu** = `listServices()` (active) → rendered by `BookingFlow`.
- **Selection meta** = selected service's `priceCents` / `durationMinutes` / `requiresDeposit` drive the
  deposit (50%) and the booking slot duration.
- **Admin calendar durations** = `id → durationMinutes` map from `listServices({ includeInactive: true })`,
  fallback `30`.
- **Booking snapshot** = existing `Booking.serviceId` / `serviceName` / `priceCents` captured at submit;
  unaffected by later service edits.

## Migration

`supabase/migrations/0008_services.sql`:
1. `create table if not exists public.services (...)` with the columns/checks above.
2. `alter table public.services enable row level security;` + policies (public read active, authenticated
   read/insert/update).
3. Idempotent seed of the current six services (`on conflict (id) do nothing`).

No changes to `bookings`, `products` or `time_blocks`. `src/types/supabase.ts` gains the `services`
block.
