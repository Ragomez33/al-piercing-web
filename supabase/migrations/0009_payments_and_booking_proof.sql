-- ALPIERCING — 0009 payments_and_booking_proof (feature 018)
-- Rebuilt from specs/018-payment-methods-deposit/data-model.md §1/§4/§6 and
-- contracts/payment-data-contract.md §3.
--
-- Adds the managed payment-method catalogue, extends bookings with deposit/payment
-- proof fields, widens the status vocabulary (REJECTED/COMPLETED) and records an
-- append-only status-transition log (booking_events).
--
-- Money stays integer-cents authoritative (`deposit_cents`); `deposit_amount` is a
-- GENERATED numeric convenience so it can never drift (constitution §IV).

-- 1. Managed payment methods -------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('pago_movil', 'binance', 'zelle', 'transfer', 'cash')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  instructions text not null default '',
  is_active boolean not null default true
);

alter table public.payment_methods enable row level security;

-- Public clients only see active methods; authenticated operators manage all.
create policy "payment_methods select public" on public.payment_methods
  for select using (is_active = true);
create policy "payment_methods select authenticated" on public.payment_methods
  for select to authenticated using (true);
create policy "payment_methods insert authenticated" on public.payment_methods
  for insert to authenticated with check (true);
create policy "payment_methods update authenticated" on public.payment_methods
  for update to authenticated using (true) with check (true);
create policy "payment_methods delete authenticated" on public.payment_methods
  for delete to authenticated using (true);

grant all on public.payment_methods to anon, authenticated, service_role;

-- 2. Booking payment fields --------------------------------------------------
alter table public.bookings
  add column if not exists client_email text not null default '',
  add column if not exists payment_method_id uuid,
  add column if not exists payment_method_name text not null default '',
  add column if not exists payment_reference text not null default '',
  add column if not exists payment_proof_url text not null default '',
  add column if not exists deposit_amount numeric(10, 2)
    generated always as (deposit_cents::numeric / 100) stored;

alter table public.bookings
  drop constraint if exists bookings_payment_method_id_fkey;
alter table public.bookings
  add constraint bookings_payment_method_id_fkey
  foreign key (payment_method_id) references public.payment_methods(id) on delete set null;

-- 3. Widen the status vocabulary (keep CANCELLED for feature-009 parity) ------
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_status_check'
  ) then
    alter table public.bookings drop constraint bookings_status_check;
  end if;
  alter table public.bookings
    add constraint bookings_status_check
    check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED'));
end;
$$;

-- 4. Slot exclusivity: releasing states free the date/time --------------------
drop index if exists public.bookings_active_slot_key;
create unique index bookings_active_slot_key
  on public.bookings (booking_date, time_slot)
  where status not in ('CANCELLED', 'REJECTED');

-- 5. Append-only status transition log ---------------------------------------
create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_events enable row level security;

-- Anonymous clients create the initial (NULL -> PENDING) event on booking; only
-- authenticated operators may read the history. No update/delete (append-only).
create policy "booking_events insert public" on public.booking_events
  for insert with check (true);
create policy "booking_events select authenticated" on public.booking_events
  for select to authenticated using (true);

grant all on public.booking_events to anon, authenticated, service_role;

-- 6. Seed starter payment methods (idempotent) -------------------------------
insert into public.payment_methods (id, type, title, details, instructions, is_active)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'pago_movil',
    'Pago Móvil',
    '{"cedula":"V-00000000","telefono":"0414-000-0000","banco":"Banco de Venezuela","titular":"ALPIERCING"}'::jsonb,
    'Envía el monto del adelanto y guarda la captura del comprobante.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'binance',
    'Binance Pay',
    '{"payId":"ALPIERCING-PAY","titular":"ALPIERCING"}'::jsonb,
    'Paga el adelanto por Binance Pay y adjunta la captura con el Pay ID.',
    true
  )
on conflict (id) do nothing;
