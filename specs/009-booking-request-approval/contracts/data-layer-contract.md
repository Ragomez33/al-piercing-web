# Contract: Data Layer & Persistence

**Feature**: 009-booking-request-approval

Extends the existing hybrid data layer (`src/lib/data/store.ts` façade + adapters). The `DataStore`
interface is unchanged; this contract documents behavior the adapters MUST honor and the one migration.

## 1. Operations used

| Operation | Used by | Behavior |
|-----------|---------|----------|
| `createBooking(input)` | submit flow | Inserts a row with `status = 'PENDING'` and returns the typed `Booking`. |
| `updateBookingStatus(id, status)` | approve/cancel | Updates `status` and returns the typed `Booking`; requires the authenticated admin session (RLS). |
| `getBookedSlots(date)` | public availability | Returns `time_slot` values for `PENDING` + `CONFIRMED` on `date`. |
| `getBlockedSlots(date)` | public availability | Returns manually blocked `time_slot` values on `date`. |

No new `DataStore` methods are required.

## 2. Adapter parity (production vs demo)

Both adapters MUST enforce the same rules so demo and production behave identically (spec FR-014):

- **Active-slot exclusivity**: a second `PENDING`/`CONFIRMED` insert for the same `(date, timeSlot)` MUST
  fail. In production the DB partial unique index raises `23505`; the adapter maps it to a friendly
  `DataError` (e.g. "Ese horario ya fue solicitado. Elegí otro horario."). The local adapter applies the
  same guard before writing.
- **Status transitions**: only `PENDING → CONFIRMED` and `PENDING|CONFIRMED → CANCELLED` are accepted by
  the domain service; the adapter persists the given status.
- **Integer cents**: `priceCents`/`depositCents` remain integers (`calcDepositCents`).

## 3. Migration `0006_release_cancelled_slots.sql`

```sql
-- Release the slot when a booking is cancelled: exclusivity applies to active
-- bookings only (PENDING / CONFIRMED), matching constitution §IV ("no two
-- non-cancelled appointments may share the same slot") and public availability.
alter table public.bookings
  drop constraint if exists bookings_booking_date_time_slot_key;

create unique index if not exists bookings_active_slot_key
  on public.bookings (booking_date, time_slot)
  where status <> 'CANCELLED';
```

- Constraint name `bookings_booking_date_time_slot_key` is the default Postgres name for the `0001`
  table-level `unique (...)`; the migration drops it defensively by that name.
- No column changes → `src/types/supabase.ts` stays valid.
- RLS policies are unchanged (public `SELECT`/`INSERT`; authenticated `UPDATE`).

## 4. Security & integrity

- Public clients may only `INSERT` bookings and `SELECT` availability; they cannot change status (RLS
  `bookings update authenticated`).
- The DB uniqueness guarantee is the authority for slot exclusivity under concurrency.
- Cancelled rows are retained (soft-cancel) for auditability and no longer reserve the slot.
