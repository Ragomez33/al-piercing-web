-- ALPIERCING — feature 005: authenticated admin writes (RLS scoped per role)
-- Replaces the permissive 0001 policies: anon keeps public reads/inserts, but
-- admin writes on bookings/products require an authenticated session.
-- Contract: specs/005-admin-supabase-auth/contracts/auth-contract.md §4.

drop policy if exists "anon update bookings" on public.bookings;
drop policy if exists "anon update products" on public.products;
drop policy if exists "anon insert products" on public.products;
drop policy if exists "anon read products" on public.products;
drop policy if exists "anon read bookings" on public.bookings;
drop policy if exists "anon insert bookings" on public.bookings;

-- bookings: public reads (slot availability) + public inserts (client booking);
-- updates (status transitions) require an authenticated session.
create policy "bookings select public" on public.bookings for select using (true);
create policy "bookings insert public" on public.bookings for insert with check (true);
create policy "bookings update authenticated" on public.bookings
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- products: anonymous clients see only published items; authenticated operators
-- may select everything, insert and update (stock / published).
create policy "products select public" on public.products for select using (published = true);
create policy "products select authenticated" on public.products
  for select using (auth.role() = 'authenticated');
create policy "products insert authenticated" on public.products
  for insert with check (auth.role() = 'authenticated');
create policy "products update authenticated" on public.products
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');