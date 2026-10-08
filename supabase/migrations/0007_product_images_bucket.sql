-- ALPIERCING — public storage bucket for product images (admin uploads).
-- Public read so the catalog can render the images; uploads/updates/deletes
-- require the authenticated admin session. Idempotent.

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "product images authenticated insert" on storage.objects;
create policy "product images authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'products');

drop policy if exists "product images authenticated update" on storage.objects;
create policy "product images authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'products');

drop policy if exists "product images authenticated delete" on storage.objects;
create policy "product images authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'products');
