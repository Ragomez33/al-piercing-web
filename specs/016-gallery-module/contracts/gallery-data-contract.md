# Contract: Gallery Data Layer

**Feature**: `016-gallery-module` | Covers `src/types/domain.ts`, `src/types/supabase.ts`,
`supabase/migrations/0007_gallery.sql`, `src/lib/data/{gallery,store,realtime}.ts` and both adapters.

## 1. Entity

`GalleryItemRecord` (in `src/lib/types/domain.ts`):

```ts
interface GalleryItemRecord {
  id: string;          // uuid, data-source generated
  title: string;       // optional, defaults ""
  category: string;    // optional free text, defaults ""
  imageUrl: string;    // REQUIRED, non-empty
  isActive: boolean;   // public visibility
  createdAt: string;   // ISO, generated
}

interface NewGalleryItemInput {
  title?: string;
  category?: string;
  imageUrl: string;    // REQUIRED, validated non-empty → DataError("La imagen es obligatoria")
}
```

## 2. DataStore operations

```ts
listGalleryItems(input?: { includeInactive?: boolean }): Promise<GalleryItemRecord[]>;
createGalleryItem(input: NewGalleryItemInput): Promise<GalleryItemRecord>;
toggleGalleryItemActive(id: string): Promise<GalleryItemRecord>;
deleteGalleryItem(id: string): Promise<void>;
```

- `listGalleryItems()` (no options) returns **active only**; admin passes `{ includeInactive: true }`.
- `createGalleryItem`: `id`/`createdAt` generated, `isActive` forced `true`.
- `toggleGalleryItemActive`: flips `isActive`, returns the record; unknown id → `DataError("Imagen no encontrada")`.
- `deleteGalleryItem`: permanent delete; unknown id → same `DataError`.

## 3. Migration `supabase/migrations/0007_gallery.sql`

Mirror `0006_team_members.sql`:

- Table `public.gallery_items` with columns `id uuid pk default gen_random_uuid()`,
  `title text not null default ''`, `category text not null default ''`, `image_url text not null`,
  `is_active boolean not null default true`, `created_at timestamptz not null default now()`.
- `enable row level security`.
- Policy `gallery_items select public` → `for select using (is_active = true)`.
- Policies `select/insert/update/delete` `to authenticated` (with `using(true)` / `with check(true)` as in 0006).
- Explicit `grant all on public.gallery_items to anon, authenticated, service_role;`.

## 4. Supabase client types

`src/types/supabase.ts` gains `gallery_items` under `Tables` with `Row`/`Insert`/`Update` (snake_case:
`image_url`, `is_active`, `created_at`) and `Relationships: []`, styled exactly like `team_members`.

## 5. Adapters

- **Supabase** (`adapters/supabase.ts`): `toGalleryItem(row)` maps `image_url → imageUrl`,
  `is_active → isActive`, `created_at → createdAt`; `table("gallery_items")` queries with
  `eq("is_active", true)` when `!includeInactive`; insert/update/delete map the typed rows.
- **Local** (`adapters/local.ts`): key `alpi:gallery:v1`, guard `isGalleryItem`, seed `GALLERY_SEED`
  (from `src/lib/data/gallery.ts`), same CRUD semantics incl. the "Imagen no encontrada" error.
  Toggle reads current `isActive` and writes the flipped record.

## 6. Realtime

- `DataResource` in `src/lib/data/realtime.ts` gains `"gallery"`.
- `store.ts` `withChangeNotifications` publishes `publishDataChange("gallery")` after successful
  `createGalleryItem` / `toggleGalleryItemActive` / `deleteGalleryItem` (throwing mutations publish
  nothing), and exports `listFallbackGalleryItems()`.
- Supabase channel adds `.on("postgres_changes", { … table: "gallery_items" }, …)`.

## 7. Acceptance mapping

FR-001…FR-004, FR-014 → this contract; verified by `quickstart.md` scenarios 1, 4, 5.