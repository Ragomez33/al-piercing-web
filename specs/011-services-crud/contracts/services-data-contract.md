# Contract: Services Data Layer & Schema

**Feature**: 011-services-crud

Extends the hybrid data layer (`src/lib/data/store.ts` façade + adapters) and adds one migration. Money
is integer cents; components never call Supabase directly.

## 1. `DataStore` operations (interface extension in `src/lib/types/domain.ts`)

| Operation | Used by | Behavior |
|-----------|---------|----------|
| `listServices(input?)` | booking menu, admin list, calendar durations | Returns `PiercingService[]`. Without options → **active only** (public). With `{ includeInactive: true }` → all (admin). |
| `createService(input)` | admin create | Inserts with a generated unique `id`, `active = true`; returns the created `PiercingService`. |
| `updateService(id, patch)` | admin edit / activate / deactivate | Applies `Partial<NewServiceInput> & { active? }`; returns the updated `PiercingService`. |

Type additions:

```ts
interface NewServiceInput {
  name: string;
  category: PiercingServiceCategory;
  priceCents: number;     // integer ≥ 0
  durationMinutes: number; // integer > 0
  description: string;
  requiresDeposit: boolean;
}
```

## 2. Adapter parity (production vs demo)

Both adapters MUST enforce the same rules:

- `listServices()` returns active rows only; `listServices({ includeInactive: true })` returns all.
- `createService` validates `name` non-empty, `category` in the fixed set, `priceCents` integer ≥ 0,
  `durationMinutes` integer > 0; on failure throws a typed `DataError`.
- `updateService` rejects invalid patches the same way; `active` may be toggled.
- Money stays integer cents (no floats).

Demo (`local.ts`): array persisted under `alpi:services:v1`, seeded with `PIERCING_SERVICES` (all
`active: true`) when the key is absent.

Production (`supabase.ts`): reads/writes `public.services` through the shared typed client; rows are
narrowed to `PiercingService` (unknown categories normalized/rejected as typed errors).

## 3. Migration `0008_services.sql`

```sql
create table if not exists public.services (
  id text primary key,
  name text not null,
  category text not null check (category in ('NOSTRIL','HELIX','NAVEL','TITANIO')),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  requires_deposit boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "services select public" on public.services
  for select using (active = true);
create policy "services select authenticated" on public.services
  for select to authenticated using (true);
create policy "services insert authenticated" on public.services
  for insert to authenticated with check (true);
create policy "services update authenticated" on public.services
  for update to authenticated using (true);

-- Idempotent seed of the current menu (six services, active = true).
insert into public.services (id, name, category, description, price_cents, duration_minutes, requires_deposit, active)
values
  ('nostril', 'Nostril Piercing', 'NOSTRIL', '…', 2500, 30, true, true),
  ('septum', 'Septum Piercing', 'NOSTRIL', '…', 3000, 30, true, true),
  ('helix', 'Helix Piercing', 'HELIX', '…', 2500, 30, true, true),
  ('conch', 'Conch Piercing', 'HELIX', '…', 3000, 30, true, true),
  ('navel', 'Navel Piercing', 'NAVEL', '…', 3200, 35, true, true),
  ('titanio-premium', 'Perforación Premium + Titanio ASTM F-136', 'TITANIO', '…', 4500, 45, true, true)
on conflict (id) do nothing;
```

`src/types/supabase.ts` gains the matching `services` `Row`/`Insert`/`Update` types (Schema Control).

## 4. Security & integrity

- Public clients may only read **active** services and `SELECT`/`INSERT` bookings; they cannot modify the
  menu (RLS `services … authenticated`).
- Integer cents end-to-end; deposit remains 50% of price.
- No hard delete; deactivation is the state change.

## 5. Error handling

- Any write failure (validation, RLS/session, network) throws a typed `DataError`; the admin surfaces it
  in a `role="alert"` and does **not** optimistically change the list.
- A read failure in the booking flow falls back to the seed menu (booking-menu-contract §3).
