-- ALPIERCING — 0003 time_blocks
-- Rebuilt from specs: 006-admin-calendar/contracts/calendar-data-contract.md §4 (TBL-01).
-- Public can READ blocks (the booking form hides blocked slots); only an
-- authenticated operator can create/update/delete them.

create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  block_date date not null,
  time_slot text not null,
  duration_minutes integer not null
    check (duration_minutes in (15, 30, 60, 90, 120)),
  label text not null
);

alter table public.time_blocks enable row level security;

create policy "time_blocks select public" on public.time_blocks
  for select using (true);
create policy "time_blocks insert authenticated" on public.time_blocks
  for insert with check (auth.role() = 'authenticated');
create policy "time_blocks update authenticated" on public.time_blocks
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "time_blocks delete authenticated" on public.time_blocks
  for delete using (auth.role() = 'authenticated');
