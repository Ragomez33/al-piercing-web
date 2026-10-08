# Contract: Public Booking Request Flow

**Feature**: 009-booking-request-approval

Governs the client-facing booking form (`src/components/booking/BookingFlow.svelte`) and the domain
service it calls.

## 1. Submit sequence

On `<form onsubmit>`:

1. `event.preventDefault()` — never navigate away.
2. Ignore if a submit is already in flight or the form is invalid.
3. Set busy state: submit control disabled, label **"Procesando reserva…"**.
4. Call `submitBookingRequest(input)` (domain service) which persists the booking as `PENDING`.
5. Branch on outcome (see §2/§3).

Required input: selected service, date (today or later), time slot, `clientName`, `clientWhatsapp`.
Notes optional.

## 2. Success outcome

When persistence resolves successfully:

- A modal success panel is shown with the **exact** copy:
  > "Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad."
- The panel exposes exactly two actions:
  - **Secondary**: "Enviar comprobante / aviso por WhatsApp" → opens
    `https://wa.me/<NUMERO>?text=<notice>` (`window.open(url, "_blank")`), where the notice begins
    "Hola, acabo de solicitar una reserva…" and includes service and date/time.
  - **Primary**: dismiss ("Cerrar" / "Nueva solicitud") → closes the panel.
- The client form fields are reset (name, WhatsApp, notes, time).
- The submitted `date + timeSlot` is immediately added to the unavailable set so it cannot be re-selected
  (no refetch).
- Accessibility: panel is `role="dialog"` `aria-modal="true"` with an accessible name; focus moves into
  it on open and returns to a sensible element on close; dismissible via the primary action and Escape.

## 3. Failure outcome

When persistence rejects:

- No success panel is shown.
- No WhatsApp action is offered or opened.
- A visible, client-facing error alert is displayed (`role="alert"`), using the message from the adapter;
  duplicate-slot failures read "Ese horario ya fue solicitado. Elegí otro horario.".
- Busy state clears so the client can retry; availability may be refreshed.

## 4. WhatsApp link rules

- Built by pure functions in `src/lib/utils/booking.ts`.
- Return `null` when the configured phone is not digits-only → the action is not offered (no broken tab).
- Accented/special characters are preserved (`encodeURIComponent`).

## 5. Domain service interface (consumed by the component)

```ts
interface SubmitBookingResult {
  booking: Booking;          // persisted, status === "PENDING"
  noticeUrl: string | null;  // WhatsApp notice link (null if phone misconfigured)
}

function submitBookingRequest(input: NewBookingInput, phone: string): Promise<SubmitBookingResult>;
```

- The component MUST NOT call `dataStore`/Supabase directly (constitution §2.3, §IV).

## 6. Invariants

- A successful response implies a persisted `PENDING` row exists.
- The offered WhatsApp action always references the just-created booking.
- A failed persistence never produces a WhatsApp action.
