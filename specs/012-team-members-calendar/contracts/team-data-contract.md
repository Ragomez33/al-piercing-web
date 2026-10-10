# Contract: Team Data Layer & Schema

**Feature**: 012-team-members-calendar · **Phase**: 1 (Design & Contracts)

Extends the hybrid data layer (`src/lib/data/store.ts` façade + adapters) and adds one migration. Team
data has no money fields; components never call Supabase directly.

## 1. `DataStore` operations (interface extension in `src/lib/types/domain.ts`)

| Operation | Used by | Behavior |
|-----------|---------|----------|
| `listTeamMembers(input?)` | landing section, admin list | Returns `TeamMember[]`. Without options → **active only** (public). With `{ includeInactive: true }` → all (admin). |
| `createTeamMember(input)` | admin create | Inserts; the DB generates the UUID `id`, `isActive` defaults to `true`; returns the created `TeamMember`. |
| `updateTeamMember(id, patch)` | admin edit / activate / deactivate | Applies `Partial<NewTeamMemberInput> & { isActive?: boolean }`; returns the updated `TeamMember`. |
| `deleteTeamMember(id)` | admin delete | Hard-deletes the row (no FK references team members). |

Type additions (domain):

```ts
interface TeamMember {
  id: string;               // UUID
  name: string;
  role: string;
  avatarUrl: string;        // '' → placeholder
  bio: string;
  instagramHandle: string;  // '' allowed, no leading '@'
  isActive: boolean;
  createdAt: string;        // ISO
}

interface NewTeamMemberInput {
  name: string;
  role: string;
  avatarUrl: string;
  bio: string;
  instagramHandle: string;
}
```

`id`/`isActive`/`createdAt` are NOT part of `NewTeamMemberInput`.

## 2. Adapter parity (production vs demo)

Both adapters MUST enforce the same rules:

- `listTeamMembers()` returns active rows only; `listTeamMembers({ includeInactive: true })` returns all.
- `createTeamMember` validates `name` + `role` non-empty (trimmed) and normalizes `instagramHandle`
  (trim + strip one leading `@`); on failure throws a typed `DataError`. The `id` is generated (demo:
  `crypto.randomUUID()`).
- `updateTeamMember` rejects invalid patches the same way; `isActive` may be toggled.
- `deleteTeamMember` removes the row.
- Reads narrow/validate each record (`isTeamMember` guard) and reject unknown shapes.

Demo (`local.ts`): array persisted under `alpi:team:v1`, seeded from `src/lib/data/team.ts` when the key
is absent. This adapter is also the source of the read-failure fallback used by the public section
(`listFallbackTeamMembers()` in `store.ts`).

Production (`supabase.ts`): reads/writes `public.team_members` through the shared typed client; rows are
mapped snake_case → camelCase in `toTeamMember(row)`.

## 3. Avatar upload (`src/lib/services/storage.ts`)

- Generalize to `uploadImage(file, { prefix }): Promise<string>`:
  - Production: uploads to the public `products` bucket with `<prefix><timestamp>-<uuid>.<ext>`,
    `cacheControl: "3600"`, `upsert: false`; returns `getPublicUrl()`.
  - Demo (no backend): returns a FileReader data URL.
  - Rejects non-image files with `DataError`.
- `uploadProductImage(file)` becomes `uploadImage(file, { prefix: "product-" })` (behavior unchanged).
- Team avatars call `uploadImage(file, { prefix: "team-" })`.

## 4. Migration `0006_team_members.sql`

```sql
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

grant all on public.team_members to anon, authenticated, service_role;
```

No production seed (the studio populates through admin). `src/types/supabase.ts` gains the matching
`team_members` `Row`/`Insert`/`Update` types (Schema Control).

## 5. Security & integrity

- Public clients may only read **active** members; they cannot modify the roster (RLS `… authenticated`).
- Team data has no monetary fields; existing integer-cents and deposit rules are untouched.
- `isActive` is a soft visibility toggle; **delete** is a hard removal with an admin confirmation.

## 6. Error handling

- Any write failure (validation, RLS/session, network) throws a typed `DataError`; the admin surfaces it
  in a `role="alert"` and does **not** optimistically change the list.
- A landing read failure falls back to the demo seed via the data layer and shows a non-blocking notice.
