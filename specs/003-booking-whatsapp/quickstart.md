# Quickstart: Booking Flow & WhatsApp Deposit

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
**Clarifications applied**: 2026-10-07 (menu deep-links; deterministic agenda; deposit via WhatsApp).

Runnable validation guide. Contract: [booking contract](./contracts/booking-contract.md) ·
Model: [data model](./data-model.md).

## Prerequisites

- Node.js ≥ 22, deps installed (`npm install`).
- Feature files present:
  - `src/lib/data/services.ts` (`PiercingService`, `PIERCING_SERVICES`)
  - `src/lib/utils/money.ts` (`formatCents`, `calcDepositCents`)
  - `src/lib/utils/booking.ts` (`buildBookingWhatsAppLink`)
  - `src/components/booking/BookingFlow.svelte` (island)
  - `src/pages/index.astro` (static menu) · `src/pages/booking.astro` (shell)
  - `src/lib/config.ts` (`WHATSAPP_PHONE`)

## Setup & Commands

```bash
npm install
npx astro check   # exit 0, zero errors
npm run build     # exit 0
npm run dev       # open http://localhost:4321/
```

## Validation Scenarios

### S1 · Static service menu (FR-001, FR-002)
Open `/`: the services section lists every `PIERCING_SERVICES` entry grouped by category with
name, description, duration and price. Each row links to `/booking?service={id}`. The menu is
visible with JavaScript disabled.

### S2 · Deep link selects the service (FR-003)
Open `/booking?service=nostril`: the Nostril service is pre-selected, the selected summary is
shown and the date/time + form section is revealed.

### S3 · Date & slot selection (FR-005, FR-006)
Choose a service, then a date. Today or later is allowed; past dates are blocked by the input.
A slot grid appears; unavailable slots are disabled, selectable ones set the chosen time.
Changing the date resets the chosen time.

### S4 · Client form validation (FR-007, FR-010)
Leave name/WhatsApp empty → the confirm button stays disabled. Fill both validly → it enables.
Notes are optional.

### S5 · Deposit math (FR-008, SC-002)
For `priceCents = 2500` the deposit shows `$12.50` and the balance `$12.50`; totals are exact
for every service. Integer-cents math only.

### S6 · WhatsApp confirmation (FR-009, FR-011, SC-003/004)
Confirm a valid booking → WhatsApp opens targeting `WHATSAPP_PHONE` with the message containing
service, category, duration, date, time, price, deposit, balance, name and WhatsApp. Include an
accented name/service → text arrives intact. A non digits-only `WHATSAPP_PHONE` produces no link.

### S7 · Tokens & a11y (FR-012)
Inspect the DOM: no raw hex/rgba outside `tokens.css`; selectable rows/slots expose `aria-pressed`;
inputs are labeled; targets ≥ 44px; no horizontal scroll at 320px.

## Expected Overall Outcome

`astro check` and `npm run build` exit 0; S1–S7 pass; exactly one island hydrated
(`BookingFlow`); the landing menu remains static SSR; confirmation is a pure WhatsApp deep link.
