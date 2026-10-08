-- ALPIERCING — 0002 products
-- Rebuilt from specs: 004-admin-bookings-store/data-model.md (PRD-02),
-- 005-admin-supabase-auth/contracts/auth-contract.md §4 (RLS split).

create table public.products (
  id text primary key,
  name text not null,
  category text not null
    check (category in ('Argollas & Labrets', 'Zirconia & Navel', 'Aftercare')),
  price_cents integer not null check (price_cents >= 0),
  stock integer not null check (stock >= 0),
  image text not null default '',
  published boolean not null default true
);

alter table public.products enable row level security;

-- Anonymous clients only see published items; authenticated operators see and
-- mutate everything (stock / published).
create policy "products select public" on public.products
  for select using (published = true);
create policy "products select authenticated" on public.products
  for select using (auth.role() = 'authenticated');
create policy "products insert authenticated" on public.products
  for insert with check (auth.role() = 'authenticated');
create policy "products update authenticated" on public.products
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
