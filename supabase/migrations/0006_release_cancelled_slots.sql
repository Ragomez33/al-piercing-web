-- ALPIERCING — release the slot when a booking is cancelled (feature 009).
-- Exclusivity now applies to active bookings only (PENDING / CONFIRMED),
-- matching constitution §IV ("no two non-cancelled appointments may share the
-- same slot") and public availability. Cancelled rows no longer reserve their
-- date/time, so it becomes selectable again (FR-012/FR-013).
--
-- No column changes → src/types/supabase.ts stays accurate. RLS is unchanged.

alter table public.bookings
  drop constraint if exists bookings_booking_date_time_slot_key;

create unique index if not exists bookings_active_slot_key
  on public.bookings (booking_date, time_slot)
  where status <> 'CANCELLED';
