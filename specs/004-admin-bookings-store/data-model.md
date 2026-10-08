# Data Model: Admin Dashboard, Bookings & Hybrid Data Layer

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

> **Nature**: Hybrid persistence. Demo mode stores on-device (`localStorage`, versioned, seeded);
> production mode stores in Supabase. The domain types below are shared and mode-agnostic; money is
> integer cents (constitution PIV).

## Entities

### BKG-01 · Booking
A reservation request.
| Field | Type | Validation |
| --- | --- | --- |
| `id` | string | REQUIRED, unique |
| `createdAt` | string (ISO) | REQUIRED, set at creation |
| `clientName` | string | REQUIRED, ≥ 2 chars after trim |
| `clientWhatsapp` | string | REQUIRED, ≥ 7 chars after trim |
| `serviceId` | string | REQUIRED, must reference a known service |
| `serviceName` | string | REQUIRED, non-empty (denormalized for safety) |
| `priceCents` | integer | REQUIRED, ≥ 0 |
| `depositCents` | integer | REQUIRED, `Math.round(priceCents / 2)` |
| `date` | string | REQUIRED, local ISO `yyyy-mm-dd`, ≥ today |
| `timeSlot` | string | REQUIRED, `HH:mm`, within the agenda |
| `status` | BookingStatus | REQUIRED |
| `notes` | string | OPTIONAL |

Rules: a date+time slot MUST be exclusive for active statuses (`PENDING`, `CONFIRMED`); `CANCELLED`
releases it (FR-004/FR-005).

### BKG-02 · BookingStatus
| Value | Meaning | Blocks slot? |
| --- | --- | --- |
| `PENDING` | Received, waiting for deposit validation | yes |
| `CONFIRMED` | Deposit validated, slot locked | yes |
| `CANCELLED` | Rejected/cancelled | no |

### PRD-02 · ProductRecord
A catalog item with publishing state (extends the existing `Product`).
| Field | Type | Validation |
| --- | --- | --- |
| `id` | string | REQUIRED, unique |
| `name` | string | REQUIRED, non-empty |
| `category` | ProductCategory | REQUIRED |
| `priceCents` | integer | REQUIRED, ≥ 0 |
| `stock` | integer | REQUIRED, ≥ 0 |
| `image` | asset reference | REQUIRED at runtime; placeholder fallback |
| `published` | boolean | REQUIRED; `false` hides it from the public catalog (FR-016) |

### DTA-01 · DataMode
| Value | Storage | Detected when |
| --- | --- | --- |
| `demo` | `localStorage` + static seed | `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY` absent |
| `production` | Supabase | both env vars present |

### SLT-01 · Slot
A time block in the day agenda for a given date.
| Field | Type | Validation |
| --- | --- | --- |
| `time` | string | `HH:mm`, 30-min steps 11:00–19:30 |
| `isBusy` | derived | `true` when a `PENDING`/`CONFIRMED` booking holds it for that date |

### ADM-01 · AdminSession
| Field | Type | Description |
| --- | --- | --- |
| `unlocked` | boolean | persisted in `sessionStorage`; cleared when the browser session ends (FR-010) |

### PAY-03 · DepositPayments (display config)
| Field | Description |
| --- | --- |
| `pagoMovil` | Pago Móvil payment reference (placeholder account data, not real accounts) |
| `binancePay` | Binance Pay payment reference/ID (placeholder) |

## Relationships

- `Booking` → `Service` (by `serviceId`; name denormalized).
- `Slot` availability derives from `Booking[]` for the selected date (status filter).
- `ProductRecord` extends `Product` with `published`.
- `AdminSession` is independent (temporary browser state).
- Every module reads/writes through the `DataStore` (mode-agnostic facade).

## Validation Rules (quoted from spec/FR)

- "When a client selects a date, the system MUST mark time slots already occupied by a `PENDING` or
  `CONFIRMED` booking as unavailable" (FR-004).
- "Cancelled bookings MUST NOT block a slot" (FR-005).
- "Confirming a booking MUST persist it … with a `PENDING` status" (FR-006).
- "A product … `published: false` MUST NOT appear in the public catalog" (FR-016).
- "All writes MUST be reflected immediately and persist across reloads in the active mode" (FR-018).
- Money stays integer cents; deposit is exactly 50% (PIV).

## State Transitions

```
Booking: (client confirms)          → PENDING
         [admin: Confirmar Cita]    → CONFIRMED   (slot locked; validation done)
         [admin: Cancelar]          → CANCELLED   (slot released)

Product: (admin adds/toggles)       → created or published false→true / true→false
         [public catalog visible]   → only published=true
```

- Demo mode: transitions write the full array to `localStorage`.
- Production mode: transitions write rows through Supabase.
- Status changes MUST go through `updateBookingStatus` (never ad-hoc in components).