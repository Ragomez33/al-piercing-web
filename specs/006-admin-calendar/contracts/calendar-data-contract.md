# Calendar Data Contract: Interactive Admin Calendar

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Backed by [`data-model.md`](../data-model.md) and [`research.md`](../research.md).

## 1. Domain Types

```ts
// src/lib/types/domain.ts additions
export interface TimeBlock {
  id: string;
  date: string;            // local ISO yyyy-mm-dd
  timeSlot: string;        // HH:mm within the calendar window
  durationMinutes: number; // 15 | 30 | 60 | 90 | 120
  label: string;           // non-empty (e.g. "Almuerzo", "Personal")
}

export interface NewBlockInput {
  date: string;
  timeSlot: string;
  durationMinutes: number;
  label: string;
}

export interface SchedulePatch { date: string; timeSlot: string; }
```

## 2. DataStore Additions

```ts
export interface DataStore { // extended
  listBlocks(input?: { date?: string }): Promise<TimeBlock[]>;
  createBlock(input: NewBlockInput): Promise<TimeBlock>;
  deleteBlock(id: string): Promise<void>;
  updateBookingSchedule(id: string, patch: SchedulePatch): Promise<Booking>;
  getBlockedSlots(date: string): Promise<string[]>;
}
```
- `getBlockedSlots(date)` returns `timeSlot` values of blocks for that date (for the public form).

## 3. Availability Formula (shared by public booking + reschedule validation)

```
unavailable(date) = bookedSlots(date) ∪ blockedSlots(date)
bookedSlots(date) = bookings[date].status ∈ {PENDING, CONFIRMED} → timeSlot
```

## 4. Persistence

### Demo adapter (`local.ts`)
- Key `alpi:timeblocks:v1`, seed `[]`, full-array writes, `isTimeBlock` narrowing.
- `updateBookingSchedule`: map `date`/`timeSlot` on the booking (status unchanged).

### Production adapter (`supabase.ts`) + migration `0003_time_blocks.sql`
```sql
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  time_slot text not null,
  duration_minutes int not null check (duration_minutes in (15,30,60,90,120)),
  label text not null
);
-- RLS: public select (so the booking form hides blocked slots), authenticated mutations
create policy "time_blocks select public" on public.time_blocks for select using (true);
create policy "time_blocks insert authenticated" on public.time_blocks for insert with check (auth.role() = 'authenticated');
create policy "time_blocks update authenticated" on public.time_blocks for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "time_blocks delete authenticated" on public.time_blocks for delete using (auth.role() = 'authenticated');
```
- Blocks are rows narrowed through `isTimeBlock` at the boundary; errors become typed `DataError`.