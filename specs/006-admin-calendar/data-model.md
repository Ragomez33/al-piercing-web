# Data Model: Interactive Admin Calendar

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

> **Nature**: Adds a manual-unavailability entity (`TimeBlock`) and a schedule-update capability to
> the existing hybrid data layer. Bookings keep their current shape. Money stays integer cents.

## Entities

### TBL-01 · TimeBlock
A manual block of unavailability created by the operator.
| Field | Type | Validation |
| --- | --- | --- |
| `id` | string | REQUIRED, unique |
| `date` | string | REQUIRED, local ISO `yyyy-mm-dd` |
| `timeSlot` | string | REQUIRED, `HH:mm` inside the calendar window |
| `durationMinutes` | integer | REQUIRED, one of 15/30/60/90/120 |
| `label` | string | REQUIRED, non-empty (e.g. "Almuerzo", "Personal") |

### CAL-01 · CalendarEvent (derived view)
An appointment block rendered on the calendar.
| Field | Source | Notes |
| --- | --- | --- |
| `booking` | Booking | id, status, date, timeSlot |
| `durationMinutes` | Service.durationMinutes | drives block height |
| `top/height` | derived | `(startMin − 540) × 1.333` and `duration × 1.333` px |

### BKG-03 · SchedulePatch
Used by `[Reagendar]`.
| Field | Type | Validation |
| --- | --- | --- |
| `date` | string | REQUIRED, ISO `yyyy-mm-dd` |
| `timeSlot` | string | REQUIRED, `HH:mm`; MUST be free (no active booking, no block) |

## Relationships

- `CalendarEvent` derives from `Booking` + `Service`.
- `TimeBlock` is independent but participates in the same **slot-exclusivity** set.
- Availability(public, per date) = bookings with status `PENDING` or `CONFIRMED` **∪** `TimeBlock`
  (FR-010).
- Admin actions mutate `Booking.status`/schedule or create/delete `TimeBlock` through the store.

## Validation Rules (quoted from FR)

- "Each appointment MUST render as a block sized proportionally to its duration" (FR-003).
- "A `CONFIRMED` appointment MUST use a solid dark card with a gold border; a `PENDING` appointment
  MUST use a translucent card" (FR-004).
- "Clicking a free grid cell MUST allow the operator to create a manual time block" (FR-008).
- "An occupied cell MUST NOT accept a manual block" (FR-009).
- "Blocked times MUST be excluded from the public booking availability ... together with active
  bookings" (FR-010).
- Rescheduling MUST reject a target occupied by an active booking or a block (Assumptions).

## State Transitions

```
Booking (calendar):
  selected -> [Confirmar Seña]   -> status CONFIRMED (card turns solid+gold)
           -> [Reagendar]        -> date/timeSlot changed (exclusive target)
           -> [Cancelar Cita]    -> status CANCELLED (removed from grid)
TimeBlock (calendar):
  free cell -> create(label, duration) -> visible on grid
  block     -> delete                 -> slot becomes free again
```

- Every mutation reloads the current week from the store.
- Money displays (total / deposit / balance) are integer-cents derived values, never floats.