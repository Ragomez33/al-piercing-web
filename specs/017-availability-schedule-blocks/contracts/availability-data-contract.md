# Contract: Availability Data Layer

**Feature**: `017-availability-schedule-blocks` | Covers `src/types/domain.ts`, `src/types/supabase.ts`,
`supabase/migrations/0008_availability_blocks.sql`, `src/lib/data/{store,realtime}.ts`, both adapters and
`src/lib/data/{schedule}.ts` (demo seed).

## 1. Entities (`src/types/domain.ts`)

```ts
type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

interface AvailabilityBlock {
  id: string;           // uuid, data-source generated
  startDatetime: string; // ISO with local offset (timestamptz)
  endDatetime: string;   // ISO with local offset; strictly after start
  reason: string;        // free text, may be ""
  isFullDay: boolean;    // false → time-range; true → full-day range
  createdAt: string;     // ISO, generated
}

interface NewAvailabilityBlockInput {
  startDatetime: string;
  endDatetime: string;
  reason?: string;
  isFullDay?: boolean; // default false
}

interface StudioScheduleDay {
  weekday: Weekday;
  isOpen: boolean;
  openTime: string | null;  // "HH:mm" when open
  closeTime: string | null; // "HH:mm" when open
}

type StudioSchedule = StudioScheduleDay[]; // stable order: sun..sat

interface UpdateScheduleDayInput {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}
```

`TimeBlock`/`NewBlockInput` are **removed** and replaced by the above. Adapter mappers
(`toAvailabilityBlock`, `toStudioScheduleDay`) convert snake_case rows north-bound, mirroring
`toTeamMember`/`toGalleryItem`.

## 2. DataStore operations

```ts
listBlocks(input?: { date?: string }): Promise<AvailabilityBlock[]>;   // optional date filter
createBlock(input: NewAvailabilityBlockInput): Promise<AvailabilityBlock>;
deleteBlock(id: string): Promise<void>;
getSchedule(): Promise<StudioSchedule>;
updateSchedule(input: StudioSchedule): Promise<StudioSchedule>;
// Removed from the DataStore surface: getBookedSlots / getBlockedSlots — superseded by the
// availability service (booking-availability-contract §2); no src reads of time_blocks remain.
```

- `createBlock`: reject `endDate <= startDate` with `DataError("El fin debe ser posterior al inicio")`;
  validate both datetimes are parseable before persisting.
- `updateSchedule`: **atomic batch** — validates every day (`open` days require times and
  `closeTime > openTime`) and persists all seven rows in a single upsert (`onConflict: "weekday"`);
  returns the normalized schedule. An invalid day rejects the whole batch without partial writes.
- `listBlocks({ date })`: return blocks whose `[start, end)` interval covers any part of that local day.

## 3. Migration `supabase/migrations/0008_availability_blocks.sql`

```sql
-- public.availability_blocks
create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text not null default '',
  is_full_day boolean not null default false,
  constraint availability_blocks_range_positive
    check (end_datetime > start_datetime)
);
alter table public.availability_blocks enable row level security;

-- public.studio_schedule (one row per weekday)
create table if not exists public.studio_schedule (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  open_time time,
  close_time time,
  constraint studio_schedule_hours_consistent check (
    (not is_open) or (open_time is not null and close_time is not null and close_time > open_time)
  )
);
alter table public.studio_schedule enable row level security;

-- RLS: public reads (availability is public); only authenticated operators write.
create policy "availability_blocks select public" on public.availability_blocks
  for select using (true);
create policy "availability_blocks insert authenticated" on public.availability_blocks
  for insert to authenticated with check (true);
create policy "availability_blocks update authenticated" on public.availability_blocks
  for update to authenticated using (true) with check (true);
create policy "availability_blocks delete authenticated" on public.availability_blocks
  for delete to authenticated using (true);

create policy "studio_schedule select public" on public.studio_schedule
  for select using (true);
create policy "studio_schedule insert authenticated" on public.studio_schedule
  for insert to authenticated with check (true);
create policy "studio_schedule update authenticated" on public.studio_schedule
  for update to authenticated using (true) with check (true);
create policy "studio_schedule delete authenticated" on public.studio_schedule
  for delete to authenticated using (true);

-- Seed: current default hours (Mo–Sa 11:00–20:00, Sun closed).
insert into public.studio_schedule (weekday, is_open, open_time, close_time) values
  (1, true,  '11:00', '20:00'),
  (2, true,  '11:00', '20:00'),
  (3, true,  '11:00', '20:00'),
  (4, true,  '11:00', '20:00'),
  (5, true,  '11:00', '20:00'),
  (6, true,  '11:00', '20:00'),
  (0, false, null,    null);

-- Copy existing legacy per-slot blocks (0003) into equivalent same-day ranges.
-- The naive date+time is interpreted in the session TimeZone so the stored instant
-- matches how the local-date model treats it (studio-local time, see research R5).
insert into public.availability_blocks (start_datetime, end_datetime, reason, is_full_day)
select
  (block_date::timestamp + time_slot::time)::timestamptz as start_datetime,
  (block_date::timestamp + (time_slot::time + (duration_minutes || ' minutes')::interval))::timestamptz as end_datetime,
  label as reason,
  false
from public.time_blocks;

grant all on public.availability_blocks, public.studio_schedule
  to anon, authenticated, service_role; -- explicit intent; 0004 defaults also cover them
```

Notes: `weekday` uses `Date#getDay()` numbering (0=Sun…6=Sat). The copy step keeps `time_blocks` intact;
the app simply stops reading it.

## 4. Supabase client types

`src/types/supabase.ts` gains `availability_blocks` and `studio_schedule` table blocks under `Tables`
(Row/Insert/Update/Relationships: []), snake_case, styled like `team_members`/`gallery_items`.

## 5. Adapters

- **Supabase** (`adapters/supabase.ts`): `toAvailabilityBlock(row)` maps `start_datetime → startDatetime`,
  `end_datetime → endDatetime`, `reason`, `is_full_day → isFullDay`, `created_at → createdAt`; queries on
  `availability_blocks` (RLS gives public reads, authenticated writes); `studio_schedule` ordered by
  `weekday` in `getSchedule()`; `updateSchedule` upserts the full seven-row batch via
  `.upsert(rows, { onConflict: "weekday" })` and re-reads
  the full schedule. A `23505` on `bookings` maps to `DataError("Este horario ya no se encuentra disponible")`.
- **Local** (`adapters/local.ts`): keys `alpi:availabilityblocks:v1` and `alpi:studioschedule:v1`;
  guards `isAvailabilityBlock` / `isStudioScheduleDay`; seeds blocks `[]` and schedule from
  `src/lib/data/schedule.ts` (`DEFAULT_SCHEDULE_SEED`, the seven days of Lun–Sáb 11:00–20:00). Same
  validation and duplicate-slot message as production.

## 6. Realtime

- `DataResource` in `src/lib/data/realtime.ts` gains `"blocks"`, `"bookings"`, `"schedule"`.
- `store.ts` `withChangeNotifications` publishes `"blocks"` after successful `createBlock`/`deleteBlock`,
  `"bookings"` after `createBooking`/`updateBookingStatus`/`updateBookingSchedule`, `"schedule"` after
  `updateSchedule` (throwing mutations publish nothing). It also exports `listFallbackSchedule()`.
- Supabase channel adds `.on("postgres_changes", … table: "availability_blocks" → "blocks")`,
  `… table: "bookings" → "bookings"`, `… table: "studio_schedule" → "schedule"`.

## 7. Acceptance mapping

FR-005…FR-011 (blocks + schedule persistence/validation), FR-017/FR-018, FR-020/FR-021 → this contract,
verified by `quickstart.md` scenarios 1–3 and 7.