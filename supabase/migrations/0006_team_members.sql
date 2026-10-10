-- ALPIERCING — 0006 team_members (feature 012: Team / Staff Module)
-- Rebuilt from specs/012-team-members-calendar/contracts/team-data-contract.md §4 and data-model.md §7.
--
-- Creates the managed studio roster (uuid identity, RLS: public read of active
-- rows, authenticated write). No production seed: the studio populates it through
-- the admin "Equipo" tab. The demo adapter seeds `alpi:team:v1` from data/team.ts.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  avatar_url text not null default '',
  bio text not null default '',
  instagram_handle text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

-- Public clients only see active members; authenticated operators manage all.
create policy "team_members select public" on public.team_members
  for select using (is_active = true);
create policy "team_members select authenticated" on public.team_members
  for select to authenticated using (true);
create policy "team_members insert authenticated" on public.team_members
  for insert to authenticated with check (true);
create policy "team_members update authenticated" on public.team_members
  for update to authenticated using (true) with check (true);
create policy "team_members delete authenticated" on public.team_members
  for delete to authenticated using (true);

-- Explicit base grants (default privileges from 0004 also cover this table).
grant all on public.team_members to anon, authenticated, service_role;
