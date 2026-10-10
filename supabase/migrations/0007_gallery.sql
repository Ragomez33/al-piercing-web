-- ALPIERCING — 0007 gallery_items (feature 016: Galería / Nuestro Trabajo Module)
-- Rebuilt from specs/016-gallery-module/contracts/gallery-data-contract.md §3 and
-- data-model.md §1.
--
-- Creates the managed public gallery (uuid identity, RLS: public read of active
-- rows, authenticated write). No production seed: the studio populates it through
-- the admin "Galería" tab. The demo adapter seeds `alpi:gallery:v1` from
-- src/lib/data/gallery.ts (GALLERY_SEED).

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  category text not null default '',
  image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gallery_items enable row level security;

-- Public clients only see active photos; authenticated operators manage all.
create policy "gallery_items select public" on public.gallery_items
  for select using (is_active = true);
create policy "gallery_items select authenticated" on public.gallery_items
  for select to authenticated using (true);
create policy "gallery_items insert authenticated" on public.gallery_items
  for insert to authenticated with check (true);
create policy "gallery_items update authenticated" on public.gallery_items
  for update to authenticated using (true) with check (true);
create policy "gallery_items delete authenticated" on public.gallery_items
  for delete to authenticated using (true);

-- Explicit base grants (default privileges from 0004 also cover this table).
grant all on public.gallery_items to anon, authenticated, service_role;