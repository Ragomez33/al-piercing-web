# Quickstart Validation: Booking Request Persistence & Admin Approval

End-to-end validation guide. It proves the feature works without duplicating implementation code; details
live in [data-model.md](./data-model.md) and [contracts/](./contracts/).

## Prerequisites

- Node `>=22.12.0`, npm. Install deps: `npm install`.
- **Demo mode** (default): no env vars needed; persistence uses `localStorage`.
- **Production mode** (optional): set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`, apply the new
  migration (below), and sign in at `/admin`.

## Setup / commands

```bash
npm run dev      # http://localhost:4321 (booking at /booking, admin at /admin)
npm run check    # astro check — MUST be 0 errors (hard gate)
npm run build    # static build MUST succeed
npm run lint     # eslint MUST be clean
```

Apply the DB migration (production only), via the Supabase CLI or SQL editor:

```bash
supabase db push   # or run supabase/migrations/0006_release_cancelled_slots.sql manually
```

## Scenarios

### S1 — Submit persists before WhatsApp (US1)
1. Go to `/booking`, pick a service, a date, and an available time; fill name + WhatsApp.
2. Press confirm.
3. **Expected**: the control shows "Procesando reserva…"; a success panel appears with
   "Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad."; the form is cleared; the
   chosen time is no longer selectable; WhatsApp did **not** auto-open.
   (contracts/booking-flow-contract.md §2)

### S2 — Secondary WhatsApp notice action (US1)
1. From the success panel, activate "Enviar comprobante / aviso por WhatsApp".
2. **Expected**: `wa.me/<NUMERO>` opens in a new tab with a message starting "Hola, acabo de solicitar
   una reserva…" that includes the service and date/time and preserves accents.
   (booking-flow-contract.md §2/§4)

### S3 — Failure blocks WhatsApp (US1 / FR-007)
1. Force a persistence failure (e.g. point production mode at an unreachable DB, or simulate a duplicate
   slot by booking the same date/time from another tab).
2. Submit.
3. **Expected**: a visible error alert is shown; no success panel; WhatsApp never opens; the button
   returns to enabled.
   (booking-flow-contract.md §3)

### S4 — Duplicate slot rejected (edge case)
1. Book `date/time` successfully (S1). In a second tab, attempt the same `date/time`.
2. **Expected**: the second submit is rejected with "Ese horario ya fue solicitado. Elegí otro horario.";
   availability refreshes and the slot is disabled.
   (data-layer-contract.md §2)

### S5 — Admin status badges (US3)
1. Open `/admin?tab=calendar` with PENDING, CONFIRMED and CANCELLED bookings present.
2. **Expected**: PENDING = amber/orange, CONFIRMED = green-gold, CANCELLED = red/muted; each has a
   readable label; approve/cancel show only for PENDING.
   (admin-approval-contract.md §1/§2)

### S6 — Approve → confirmed + WhatsApp confirmation (US2)
1. Open a PENDING booking → activate "Aprobar Cita".
2. **Expected**: status becomes `CONFIRMED`; the badge updates; a "Notificar confirmación por WhatsApp"
   link is offered that opens a pre-built confirmation message for the client.
   (admin-approval-contract.md §3)

### S7 — Cancel releases the slot (US2 / FR-012)
1. With an active booking, activate "Cancelar".
2. **Expected**: status becomes `CANCELLED` (red/muted); the same date/time is selectable again at
   `/booking` for that date (requires migration `0006` in production).
   (data-layer-contract.md §3, admin-approval-contract.md §4)

### S8 — Demo/production parity (FR-014)
1. Run scenarios S1–S7 in demo mode (no env) and again in production mode.
2. **Expected**: identical behavior, copy and WhatsApp links in both modes.
   (data-layer-contract.md §2)

### S9 — Accessibility & responsive (FR-016)
1. Keyboard-only: reach the success panel, read its label, dismiss it; focus returns sensibly.
2. Resize 320px → 1920px.
3. **Expected**: success panel is announced (`role="dialog"`/`aria-modal`, accessible name); focus is
   visible; targets ≥44px; no horizontal page scroll.
   (booking-flow-contract.md §2)

## Exit criteria

- All scenarios above pass.
- `npm run check` → **0 errors, 0 warnings** (explicit user requirement).
- `npm run build` and `npm run lint` succeed.
- `Booking` / `BookingStatus` / `NewBookingInput` / `DataStore` remain the single shared types; no `any`;
  no direct Supabase calls in components.
