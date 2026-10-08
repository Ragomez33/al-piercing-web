-- ALPIERCING — initial hybrid data schema (production mode)
-- Mirror of contracts/data-layer-contract.md §3.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_name text not null,
  client_whatsapp text not null,
  service_id text not null,
  service_name text not null,
  price_cents integer not null check (price_cents >= 0),
  deposit_cents integer not null check (deposit_cents >= 0),
  booking_date date not null,
  time_slot text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'CANCELLED')),
  notes text,
  -- a booking_date + time slot is exclusive for active bookings (PENDING/CONFIRMED)
  unique (booking_date, time_slot)
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null
    check (category in ('Argollas & Labrets', 'Zirconia & Navel', 'Aftercare')),
  price_cents integer not null check (price_cents >= 0),
  stock integer not null check (stock >= 0),
  image text not null default '',
  published boolean not null default true
);

alter table public.bookings enable row level security;
alter table public.products enable row level security;

-- Skeleton policies: permissive public access for the anon key (static site has no
-- server secrets). Tighten before real launch.
create policy "anon read bookings" on public.bookings for select using (true);
create policy "anon insert bookings" on public.bookings for insert with check (true);
create policy "anon update bookings" on public.bookings for update using (true);
create policy "anon read products" on public.products for select using (true);
create policy "anon insert products" on public.products for insert with check (true);
create policy "anon update products" on public.products for update using (true);