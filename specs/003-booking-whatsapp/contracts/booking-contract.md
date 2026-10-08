# Booking Contract: Booking Flow & WhatsApp Deposit

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
**Clarifications applied**: 2026-10-07 (menu deep-links; deterministic agenda; deposit via WhatsApp).

Defines the typed domain contract, the WhatsApp message contract and the UI wiring of the single
interactive island (backed by [`data-model.md`](../data-model.md)).

## 1. Data Contract

```ts
// src/lib/data/services.ts — strict TypeScript, integer-cents (PIII/PIV)
export interface PiercingService {
  id: string;
  name: string;
  category: "Nariz" | "Oreja" | "Boca" | "Corporal";
  priceCents: number;        // integer cents
  durationMinutes: number;
  description: string;
  requiresDeposit: boolean;
}

export const PIERCING_SERVICES: PiercingService[];
```

## 2. Utility Contract

```ts
// src/lib/utils/money.ts
export function formatCents(cents: number): string;          // "$12.50" (Intl, USD)
export function calcDepositCents(totalCents: number): number; // Math.round(totalCents / 2)

// src/lib/utils/booking.ts
export interface BookingRequest {
  phone: string;             // digits only
  service: PiercingService;
  date: string;              // ISO yyyy-mm-dd
  time: string;              // HH:mm
  clientName: string;
  clientWhatsapp: string;
  notes?: string;
}

export function buildBookingWhatsAppLink(request: BookingRequest): string | null;
// null when phone is not digits-only or any required field is empty
```

## 3. WhatsApp Message Contract

Template (lines joined with `\n`, then `encodeURIComponent`):

```text
Hola! Quiero reservar un turno de piercing:

Servicio: {name}
Categoría: {category}
Duración: {duration} min
Fecha: {date}
Hora: {time}

Precio: {price}
Seña (50%): {deposit}
Saldo en el local: {balance}

Datos del cliente:
Nombre: {clientName}
WhatsApp: {clientWhatsapp}
Notas: {notes}          # only when present

¿Me confirman disponibilidad para abonar la seña?
```

Rules: prices in dollars with 2 decimals; empty/missing required data → `null`; accents preserved
(FR-011).

## 4. UI Contract

### index.astro (static SSR menu)
- Renders `PIERCING_SERVICES` grouped by `PIERCING_SERVICE_CATEGORIES`, each row linking to
  `/booking?service={id}` with name, description, duration, price and a deposit hint.
- Gallery section renders `GALLERY_ITEMS` with the `data-fallback` placeholder mechanism.
- No `client:` directive — fully static.

### booking.astro (static shell)
- Uses `BaseLayout`; renders the section heading and mounts the single island:
  `<BookingFlow client:load />`.

### BookingFlow.svelte (the single island, `client:load`)
- **Menu**: rows with `aria-pressed`; selecting one reveals the form and scrolls to it.
- **Deep link**: on mount reads `?service={id}` and pre-selects the matching service.
- **Date**: `<input type="date" min={today}>`; changing it resets the chosen time.
- **Slots**: 30-minute agenda 11:00–19:30; unavailable slots `disabled`.
- **Form**: name + WhatsApp required, notes optional; `fieldset` for slot grouping.
- **Deposit**: `Deposit` entity rendered with `tabular-nums`.
- **Confirm**: `buildBookingWhatsAppLink` → `window.open`; disabled until valid (FR-010).
- Token-only styling (`--accent-primary`, `--accent-on`, `--bg-badge-pill`, `--radius-*`, …).
