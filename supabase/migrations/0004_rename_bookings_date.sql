-- ALPIERCING — bookings.date -> booking_date (PostgreSQL column-name fix)
-- Safe for environments where 0001 was applied with the old name; no-op when already renamed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'date'
  ) then
    alter table public.bookings rename column "date" to booking_date;
  end if;
end $$;