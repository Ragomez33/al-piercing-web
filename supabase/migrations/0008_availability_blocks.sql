-- ALPIERCING — 0008 availability_blocks + studio_schedule (feature 017)
-- Rebuilt from specs/017-availability-schedule-blocks/contracts/availability-data-contract.md §3
-- and data-model.md §1/§3.
--
-- Introduces the range-based unavailability model and the weekly studio schedule:
--   - availability_blocks: manual unavailability intervals ([start_datetime, end_datetime)),
--     full-day flag and free-text reason. Public can READ (the booking engine hides blocked
--     time); only an authenticated operator can create/update/delete.
--   - studio_schedule: one row per weekday (0=Sunday .. 6=Saturday, matching Date#getDay()),
--     open/close times and an is_open flag. Public can READ; only an authenticated operator
--     can change it.
--
-- The legacy per-slot table `time_blocks` (0003) is intentionally NOT dropped or altered; its
-- rows are copied into equivalent same-day ranges so no previously created block is lost.
--
-- NOTE ON THE COPY: the naive date+time is interpreted in the session TimeZone so the stored
-- instant matches how the app's local-date model treats it (studio-local time, research R5).

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text not null default '',
  is_full_day boolean not null default false,
  constraint availability_blocks_range_positive
    check (end_datetime > start_datetime)
);

alter table public.availability_blocks enable row level security;

create table if not exists public.studio_schedule (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  open_time time,
  close_time time,
  constraint studio_schedule_hours_consistent check (
    (not is_open) or (open_time is not null and close_time is not null and close_time > open_time)
  )
);

alter table public.studio_schedule enable row level security;

-- RLS: availability is public (the booking engine and agenda read it); writes are
-- restricted to authenticated operators (feature 005 auth-contract §4).
create policy "availability_blocks select public" on public.availability_blocks
  for select using (true);
create policy "availability_blocks insert authenticated" on public.availability_blocks
  for insert to authenticated with check (true);
create policy "availability_blocks update authenticated" on public.availability_blocks
  for update to authenticated using (true) with check (true);
create policy "availability_blocks delete authenticated" on public.availability_blocks
  for delete to authenticated using (true);

create policy "studio_schedule select public" on public.studio_schedule
  for select using (true);
create policy "studio_schedule insert authenticated" on public.studio_schedule
  for insert to authenticated with check (true);
create policy "studio_schedule update authenticated" on public.studio_schedule
  for update to authenticated using (true) with check (true);
create policy "studio_schedule delete authenticated" on public.studio_schedule
  for delete to authenticated using (true);

-- Seed: current default hours (Mo–Sa 11:00–20:00, Sun closed) — same values as
-- DEFAULT_BUSINESS_HOURS in src/lib/utils/hours.ts.
insert into public.studio_schedule (weekday, is_open, open_time, close_time) values
  (1, true,  '11:00', '20:00'),
  (2, true,  '11:00', '20:00'),
  (3, true,  '11:00', '20:00'),
  (4, true,  '11:00', '20:00'),
  (5, true,  '11:00', '20:00'),
  (6, true,  '11:00', '20:00'),
  (0, false, null,    null);

-- Copy existing legacy per-slot blocks (0003) into equivalent same-day ranges.
insert into public.availability_blocks (start_datetime, end_datetime, reason, is_full_day)
select
  (block_date::timestamp + time_slot::time)::timestamptz as start_datetime,
  (block_date::timestamp + (time_slot::time + (duration_minutes || ' minutes')::interval))::timestamptz as end_datetime,
  label as reason,
  false
from public.time_blocks;

-- Explicit base grants (0004 defaults also cover these tables; kept for intent).
grant all on public.availability_blocks, public.studio_schedule
  to anon, authenticated, service_role;