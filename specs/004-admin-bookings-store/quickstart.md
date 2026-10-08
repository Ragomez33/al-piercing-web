# Quickstart: Admin Dashboard, Bookings & Hybrid Data Layer

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Contracts: [data layer](./contracts/data-layer-contract.md) · [admin UI](./contracts/admin-ui-contract.md) ·
Model: [data model](./data-model.md).

Runnable validation guide. Implementation details live in `tasks.md`.

## Prerequisites

- Node.js ≥ 22, deps installed (`npm install`). Add `@supabase/supabase-js` (production adapter).
- Feature files present: `src/lib/types/domain.ts`, `src/lib/data/store.ts`,
  `src/lib/data/adapters/{local,supabase}.ts`, `src/lib/utils/dates.ts`, `src/lib/config.ts`
  (extended), `src/components/admin/AdminPanel.svelte`, `src/components/catalog/CatalogGrid.svelte`,
  extended `BookingFlow.svelte`, `src/pages/admin.astro` (island host).

## Setup & Commands

```bash
npm install
npx astro check   # exit 0, zero errors
npm run build     # exit 0
npm run dev       # open http://localhost:4321
```

## Validation Scenarios

### S1 · Demo mode auto-detection (FR-001, US4)
Run with **no** `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY`. Open the site and use the full
client + admin flow; confirm the data layer reports `mode: demo` and every change survives a reload.

### S2 · Production mode auto-switch (FR-002, US4)
Set both public Supabase variables (e.g. `.env`) and rebuild. Repeat S1 and confirm reads/writes go
to the live backend with **no code change**.

### S3 · Occupied slots blocked (FR-004/FR-005)
Create a booking for a date/time in demo mode. Reopen `/booking?service=nostril`, pick the same date:
the slot is disabled and cannot be selected. Cancel that booking from `/admin` and confirm the slot
becomes selectable again.

### S4 · Booking persists + WhatsApp + payment summary (FR-006/007/008/009)
Confirm a booking from `/booking`: it persists (reload keeps it), WhatsApp opens with the summary
addressed to `PUBLIC_WHATSAPP_PHONE` (fallback: `WHATSAPP_PHONE`), and the summary shows the 50%
deposit and the Pago Móvil / Binance Pay details.

### S5 · Admin PIN gate (FR-010)
Open `/admin` without unlocking → no data shown. Wrong PIN → inline error, still locked. PIN `1234`
→ panel unlocks; after a new browser session it locks again; the "Bloquear" action relocks it.

### S6 · Bookings tab (FR-011/012/013)
In `/admin?tab=bookings`, confirm each row shows client, service, date/time, status badge and deposit.
Use `[Confirmar Cita]` (status → `CONFIRMED`) and `[Cancelar]` (status → `CANCELLED`). Filter by a
date and confirm only that day's bookings appear.

### S7 · Catalog tab (FR-014/015/016/017)
In `/admin?tab=catalog`, edit a product's stock inline and save (value persists). Toggle a product's
publish switch → it disappears/dims in admin and is **hidden from the public catalog**. Add a new
product via the modal (name, category, price cents, stock, image) → it appears in both tables.

### S8 · Public catalog reads published products (FR-016)
On `/catalog`, verify unpublished products never appear and stock changes from admin are reflected.

### S9 · Build & type gates (SC-007 / FR-020)
`npx astro check` and `npm run build` complete with **zero errors and zero warnings**.

### S10 · Tokens & a11y (FR-019)
Inspect new UI: no raw hex outside `tokens.css`; control labels present; publish toggles expose
`aria-pressed`; targets ≥ 44px; no horizontal scroll at 320px.

## Expected Overall Outcome

`astro check` and `astro build` exit 0; S1–S10 pass in demo mode (and S2 repeats the key flows in
production mode); the public pages consume data only through the unified store; the admin panel is
PIN-gated and manages bookings and catalog as specified.