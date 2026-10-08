# Data Model: Booking Flow & WhatsApp Deposit

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
**Clarifications applied**: 2026-10-07 (menu deep-links; deterministic agenda; deposit via WhatsApp).

> **Nature**: Static content + ephemeral component state only. No persistence, migrations or
> backend writes in this feature. PocketBase entities are planned for a later feature.

## Entities

### SVC-01 · PiercingService
A fixed, bookable piercing service (single source of truth: `src/lib/data/services.ts`).
| Field | Type | Validation |
| --- | --- | --- |
| `id` | string | REQUIRED, non-empty, unique |
| `name` | string | REQUIRED, non-empty |
| `category` | `"Nariz" \| "Oreja" \| "Boca" \| "Corporal"` | REQUIRED |
| `priceCents` | integer | REQUIRED, ≥ 0 (money as integer cents) |
| `durationMinutes` | integer | REQUIRED, > 0 |
| `description` | string | REQUIRED, non-empty |
| `requiresDeposit` | boolean | REQUIRED (menu indicator; deposit is computed regardless) |

### SVC-02 · Slot
A bookable time within the daily agenda.
| Field | Type | Validation |
| --- | --- | --- |
| `time` | string | `HH:mm`, from 11:00 to 19:30 in 30-minute steps |
| `available` | derived boolean | false for busy slots (deterministic per date) and outside the agenda |

### BKG-01 · BookingRequest
The collected booking intent.
| Field | Type | Validation |
| --- | --- | --- |
| `service` | PiercingService | REQUIRED |
| `date` | string | REQUIRED, ISO `yyyy-mm-dd`, ≥ today |
| `time` | string | REQUIRED, `HH:mm`, an available slot |
| `clientName` | string | REQUIRED, length ≥ 2 after trim |
| `clientWhatsapp` | string | REQUIRED, ≥ 7 characters after trim |
| `notes` | string | optional |

### PAY-02 · Deposit
Derived from the selected service (never stored as a float).
| Field | Type | Validation |
| --- | --- | --- |
| `depositCents` | integer | `Math.round(service.priceCents / 2)` |
| `balanceCents` | integer | `service.priceCents - depositCents` |

### MSG-02 · BookingMessage
Message composed for WhatsApp confirmation (not persisted).
| Field | Type | Validation |
| --- | --- | --- |
| `service` | string | `{name}` + category |
| `schedule` | string | `{date}` `{time}` + duration |
| `money` | string | `Precio`, `Seña (50%)`, `Saldo en el local` (2 decimals) |
| `client` | string | `Nombre`, `WhatsApp`, optional `Notas` |
| `phone` | digits string | Configured studio number (`WHATSAPP_PHONE`) |

## Relationships

- `BookingRequest` → `PiercingService` (selection) + `Slot` (chosen time).
- `Deposit` derives from `PiercingService.priceCents`.
- `BookingMessage` derives from `BookingRequest` + `Deposit` + the phone config.

## Validation Rules (state-level, quoted from spec)

- "The date selector MUST not allow dates before today" (FR-005).
- "Unavailable slots ... cannot be chosen" (FR-006).
- "Require name and WhatsApp; notes are optional" (FR-007).
- "Compute a 50% deposit and the remaining balance ... using integer-cents math" (FR-008).
- "Confirmation MUST be disabled until service, date, time, name and WhatsApp are valid" (FR-010).

## State Transitions

Booking lifecycle (synchronous, in the island):

```
Idle (menu only)
  │  selectService(service)         [from menu or ?service=id]
  ▼
Service selected
  │  set date                       (time resets)
  ▼
Date chosen ── set time ──► Slot chosen
  │  fill valid name + whatsapp
  ▼
Ready ── [confirm enabled] → BookingMessage → WhatsApp link
```

- Changing the date after picking a time resets the time.
- Confirmation never fires while any required field is invalid.
