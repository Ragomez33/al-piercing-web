-- ALPIERCING — 0004 grants
-- Base privileges for the PostgREST roles on the rebuilt public schema.
-- `anon`/`authenticated` are still gated by RLS; `service_role` bypasses RLS.
-- Default privileges keep future tables/routines/sequences accessible without
-- repeating GRANT after every migration.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
