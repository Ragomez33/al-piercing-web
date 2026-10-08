# Contract: Admin Approval & Status Badges

**Feature**: 009-booking-request-approval

Governs the admin agenda (`src/components/admin/AdminCalendar.svelte`) and its actions.

## 1. Status badges

Every appointment is rendered with a status badge that is distinguishable by color and carries a
readable label:

| Status | Label (ES) | Tone | Tokens |
|--------|-----------|------|--------|
| `PENDING` | "Pendiente" | Amber / orange | `--accent-gold`, `--bg-wood-pill` |
| `CONFIRMED` | "Confirmado" | Green-gold | `--accent-positive` + `--accent-gold` accent (border/glow) |
| `CANCELLED` | "Cancelado" | Red / muted | `--accent-negative`, `--text-muted` |

Only tokens from `tokens.css` may be used; new tokens are added there first and mirrored in
`design-system.md`.

## 2. Actions by status

| Status | Actions offered |
|--------|-----------------|
| `PENDING` | **Aprobar Cita**, **Cancelar** (plus existing Reagendar) |
| `CONFIRMED` | **Cancelar** (plus Reagendar) and a re-sendable "Notificar confirmación por WhatsApp" link |
| `CANCELLED` | none (detail only) |

- Approval MUST NOT be offered for non-`PENDING` bookings.
- Actions are disabled while an action is in flight (no double approval/cancel).

## 3. Approve action

1. Call `approveBooking(id, phone)` (domain service).
2. Service sets the persisted status to `CONFIRMED` and returns
   `{ booking, confirmationUrl }`.
3. The agenda refreshes to reflect the new state/badge.
4. The operator is offered a WhatsApp link (`confirmationUrl`) with a pre-built confirmation message
   (service, date, time). The operator opens it manually.

## 4. Cancel action

1. Call `cancelBooking(id)` (domain service).
2. Service sets the persisted status to `CANCELLED`.
3. The slot is released (DB partial unique index excludes `CANCELLED`) and the agenda refreshes; the
   freed slot is selectable again in the public availability view.

## 5. Domain service interface

```ts
interface ApprovalResult {
  booking: Booking;             // status === "CONFIRMED"
  confirmationUrl: string | null;
}

function approveBooking(id: string, phone: string): Promise<ApprovalResult>;
function cancelBooking(id: string): Promise<Booking>;
```

- Components MUST delegate transitions to this service (constitution §IV).
- Errors are surfaced as a visible alert in the admin modal; failed transitions leave the persisted state
  unchanged.

## 6. Error handling

- Any persistence failure (e.g. RLS/auth expiry, network) shows an error message in the modal and does not
  optimistically flip the badge.
- Approving an already-transitioned booking is a no-op/ignored, keeping the final state consistent.
