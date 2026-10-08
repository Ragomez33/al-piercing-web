-- ALPIERCING — 0001 bookings
-- Rebuilt from specs: 004-admin-bookings-store/data-model.md (BKG-01/BKG-02),
-- 009-booking-request-approval/data-model.md (active-slot partial unique index).
--
-- NOTE: `public.services` (feature 011) is intentionally NOT part of this rebuild,
-- so `bookings.service_id` carries no FK yet. The FK (service_id -> services.id)
-- will be added together with migration 0008_services.sql (feature 011).

create table public.bookings (
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
  notes text
);

-- Slot exclusivity applies to active bookings only; CANCELLED releases the slot
-- (constitution §4, feature 009 FR-012/FR-013).
create unique index bookings_active_slot_key
  on public.bookings (booking_date, time_slot)
  where status <> 'CANCELLED';

alter table public.bookings enable row level security;

-- RLS split (feature 005 auth-contract §4): public reads availability and creates
-- client bookings; only an authenticated admin session may change status.
create policy "bookings select public" on public.bookings
  for select using (true);
create policy "bookings insert public" on public.bookings
  for insert with check (true);
create policy "bookings update authenticated" on public.bookings
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
