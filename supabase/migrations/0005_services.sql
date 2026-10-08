-- ALPIERCING — 0005 services (feature 011: Managed Service Catalog)
-- Rebuilt from specs/011-services-crud/data-model.md and services-data-contract.md §3.
--
-- Creates the managed service menu (uuid identity, RLS: public read of active rows,
-- authenticated write/delete), wires the real FK on bookings (ON DELETE SET NULL so
-- booking snapshots survive a service deletion) and idempotently seeds today's menu.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('NOSTRIL', 'HELIX', 'NAVEL', 'TITANIO')),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  requires_deposit boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

-- Public clients only see active services; authenticated operators manage all.
create policy "services select public" on public.services
  for select using (active = true);
create policy "services select authenticated" on public.services
  for select to authenticated using (true);
create policy "services insert authenticated" on public.services
  for insert to authenticated with check (true);
create policy "services update authenticated" on public.services
  for update to authenticated using (true) with check (true);
create policy "services delete authenticated" on public.services
  for delete to authenticated using (true);

-- Real FK: bookings reference a service; deleting a service nulls the reference
-- while the booking keeps its stored name/price snapshot (feature 011 FR-017/FR-018).
alter table public.bookings alter column service_id type uuid using service_id::uuid;
alter table public.bookings alter column service_id drop not null;
alter table public.bookings
  add constraint bookings_service_id_fkey
  foreign key (service_id) references public.services(id) on delete set null;

-- Explicit base grants (default privileges from 0004 also cover this table).
grant all on public.services to anon, authenticated, service_role;

-- Idempotent seed of the current menu (fixed UUIDs, active = true).
insert into public.services (id, name, category, description, price_cents, duration_minutes, requires_deposit, active)
values
  ('00000000-0000-4000-8000-000000000001', 'Nostril Piercing', 'NOSTRIL', 'Perforación lateral de la nariz con joya inicial de titanio.', 2500, 30, true, true),
  ('00000000-0000-4000-8000-000000000002', 'Septum Piercing', 'NOSTRIL', 'Perforación del tabique nasal con argolla o herradura de titanio.', 3000, 30, true, true),
  ('00000000-0000-4000-8000-000000000003', 'Helix Piercing', 'HELIX', 'Perforación en el cartílago superior de la oreja.', 2500, 30, true, true),
  ('00000000-0000-4000-8000-000000000004', 'Conch Piercing', 'HELIX', 'Perforación en la concha del cartílago auricular con joya de titanio.', 3000, 30, true, true),
  ('00000000-0000-4000-8000-000000000005', 'Navel Piercing', 'NAVEL', 'Perforación del ombligo con navel ring de titanio.', 3200, 35, true, true),
  ('00000000-0000-4000-8000-000000000006', 'Perforación Premium + Titanio ASTM F-136', 'TITANIO', 'Perforación con joyería premium de titanio ASTM F-136 (grado implante) y zirconia.', 4500, 45, true, true)
on conflict (id) do nothing;
