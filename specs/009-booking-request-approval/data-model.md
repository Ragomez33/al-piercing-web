# Phase 1 Data Model: Booking Request Persistence & Admin Approval

The domain entity already exists (`src/lib/types/domain.ts`). This feature changes **behavior and
constraints**, not the column set, so no TypeScript type expansion is required — only a DB constraint
migration.

## Entity: Booking

Represents a client's appointment request and its lifecycle.

| Field | Type | Rules |
|-------|------|-------|
| `id` | `string` (uuid) | PK; generated on insert. |
| `createdAt` | ISO timestamp | Set on insert. |
| `clientName` | `string` | Required, non-empty (trimmed length > 1). |
| `clientWhatsapp` | `string` | Required, digits/`+`; trimmed length ≥ 7. |
| `serviceId` | `string` | Must match a `PiercingService` id. |
| `serviceName` | `string` | Denormalized copy of the service name at booking time. |
| `priceCents` | `integer` | ≥ 0; integer cents (never float). |
| `depositCents` | `integer` | `round(priceCents / 2)`, computed on insert. |
| `date` | `string` (`yyyy-mm-dd`) | Local ISO; not before today. |
| `timeSlot` | `string` (`HH:mm`) | Must be one of the agenda slots (11:00–19:30 step 30). |
| `status` | `PENDING \| CONFIRMED \| CANCELLED` | Default `PENDING`. |
| `notes` | `string?` | Optional. |

### Status lifecycle (state machine)

```
            submit (public)
                 │
                 ▼
   ┌─────────► PENDING ──────────┐
   │             │               │
   │        approve (admin)   cancel (admin)
   │             │               │
   │             ▼               ▼
   │         CONFIRMED        CANCELLED  (releases the slot)
   │                             │
   │        cancel (admin)       │
   └─────────────┴───────────────┘

Terminal states: CONFIRMED (can still be cancelled), CANCELLED (terminal).
```

Transition rules (enforced in `src/lib/services/booking.ts`):

- `submit` → only a new `PENDING` row may be created.
- `approve` → allowed only from `PENDING` (or a no-op returning the current `CONFIRMED`); sets `CONFIRMED`.
- `cancel` → allowed from `PENDING` or `CONFIRMED`; sets `CANCELLED`.
- No transition may leave a booking in an undefined state; the adapter normalizes unknown server values to
  `PENDING` (existing behavior).

### Persistence constraints

- `status` is constrained to the three values (migration `0001`).
- **Changed by this feature** (`0006_release_cancelled_slots.sql`): the table-level
  `unique (booking_date, time_slot)` becomes a **partial unique index**
  `on public.bookings (booking_date, time_slot) where status <> 'CANCELLED'`.
  - Active slots (`PENDING`, `CONFIRMED`) stay exclusive.
  - `CANCELLED` rows no longer reserve their slot → freeing it for reuse (FR-012).
- Money stays integer cents (constitution §IV).

### Validation rules (all layers)

| Rule | Where | Failure behavior |
|------|-------|------------------|
| Required client/service/date/time fields | Component (form) + service | Submit disabled / error alert (no persistence). |
| `priceCents`, `depositCents` integer ≥ 0 | DB check + `calcDepositCents` | Rejected by DB; typed `DataError`. |
| Slot date/time exclusive for active bookings | DB partial unique index + local adapter guard | `DataError` mapped to "Ese horario ya fue solicitado…" (23505). |
| Phone digits-only for WhatsApp links | `src/lib/utils/booking.ts` | Link is `null`; no WhatsApp action offered. |
| Status transition legality | `src/lib/services/booking.ts` | Rejected/ignored; UI stays consistent. |

## Derived projection: Public availability

For a given `date`, the set of unavailable slots is:

```
unavailable(date) = { booking.timeSlot
                        | booking.date == date
                        | booking.status ∈ {PENDING, CONFIRMED} }
                  ∪ { block.timeSlot | block.date == date }
```

This matches `dataStore.getBookedSlots(date)` + `dataStore.getBlockedSlots(date)`, which the booking page
already combines. On successful submit the newly taken slot is added to the local unavailable set without
refetching (FR-005).

## Key Entities (contract-level)

- **Booking** — as above; drives both the public availability projection and the admin badges/actions.
- **AvailabilitySlot** — a derived `{date, timeSlot, unavailable}` value; never persisted.
- **StatusBadge** — a derived presentational view of `Booking.status` with label + tone + allowed actions.
- **WhatsAppNotice / WhatsAppConfirmation** — derived strings built from a `Booking` + configured phone;
  not persisted.

## Migration

`supabase/migrations/0006_release_cancelled_slots.sql`:

1. Drop the existing unique constraint on `(booking_date, time_slot)`.
2. Create a partial unique index on `(booking_date, time_slot)` where `status <> 'CANCELLED'`.

No column or type changes → `src/types/supabase.ts` remains accurate. RLS is unchanged: public `SELECT`
and `INSERT` stay permissive; `UPDATE` (status transitions) requires the authenticated admin session
(migration `0002`).
