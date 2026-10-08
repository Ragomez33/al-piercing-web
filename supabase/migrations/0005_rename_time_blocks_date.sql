-- ALPIERCING — time_blocks.date -> block_date (PostgreSQL column-name parity with bookings)
-- Safe for environments where 0003 was applied with the old name; no-op when already renamed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'time_blocks' and column_name = 'date'
  ) then
    alter table public.time_blocks rename column "date" to block_date;
  end if;
end $$;