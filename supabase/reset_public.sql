-- ALPIERCING — reset operativo del schema `public` (NO es una migración).
-- Se ejecuta UNA vez de forma manual contra la DB hosted, ANTES de `supabase db push`.
--
-- Alcance:
--   * elimina y recrea `public` (schema vacío);
--   * recrea los grants base y los default privileges de los roles PostgREST;
--   * restaura el helper de auto-RLS de Supabase (`public.rls_auto_enable` y el
--     event trigger `ensure_rls`), que vive en `public` y cae con el CASCADE;
--   * limpia el historial de migraciones (`supabase_migrations`).
--
-- NO toca: storage (bucket `products` y objetos), auth, realtime, vault ni el
-- schema `extensions` (donde viven pgcrypto/uuid-ossp). `gen_random_uuid()` es
-- built-in en PostgreSQL 13+ (pg_catalog), por lo que no requiere extensión.

drop schema if exists public cascade;
create schema public;

-- Grants base para PostgREST (RLS sigue siendo la autorización efectiva).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Restaura el helper de auto-RLS gestionado por Supabase (se pierde con el CASCADE).
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
       AND cmd.schema_name IN ('public')
       AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
       AND cmd.schema_name NOT LIKE 'pg_toast%'
       AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip %', cmd.object_identity;
    END IF;
  END LOOP;
END;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- Historial de migraciones limpio: lo recrea `supabase db push`.
drop schema if exists supabase_migrations cascade;
