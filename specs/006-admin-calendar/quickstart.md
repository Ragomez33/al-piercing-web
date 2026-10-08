# Quickstart: Interactive Admin Calendar

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Contracts: [data](./contracts/calendar-data-contract.md) · [UI](./contracts/calendar-ui-contract.md) ·
Model: [data model](./data-model.md).

Runnable validation guide. Implementation details live in `tasks.md`.

## Prerequisites

- Node.js ≥ 22, deps installed (`npm install`).
- Feature files: `src/lib/utils/calendar.ts`, `src/components/admin/AdminCalendar.svelte`, edited
  `AdminPanel.svelte`, `BookingFlow.svelte`, adapters + types, `supabase/migrations/0003_time_blocks.sql`.

## Setup & Commands

```bash
npm install
npx astro check   # exit 0, zero errors
npm run build     # exit 0
npm run dev       # open http://localhost:4321/admin
```

## Validation Scenarios

### S1 · Week renders (FR-002/003, SC-001)
Sign in, open `/admin` (default calendar): the weekly grid shows Mon–Sun columns and the 09:00–19:30
time axis; bookings appear in the right column/position sized to their duration; prev/next pager
changes the week.

### S2 · Card styles (FR-004, FR-005)
A `CONFIRMED` booking renders solid `#1A1A1E` with a gold border; a `PENDING` booking renders
translucent; each card shows `HH:mm – Client (Service)`.

### S3 · Detail modal (FR-006/007, SC-002)
Click a booking → modal shows WhatsApp, service, total, seña (50%) and saldo. `[Confirmar Seña]`
flips it to CONFIRMED (card restyles). `[Cancelar Cita]` removes it. `[Reagendar]` opens date + free
slots; moving to a free slot relocates the card.

### S4 · Reschedule exclusivity (FR-009, Assumptions)
Try to reschedule onto an occupied or blocked slot → the target is disabled/rejected; a free target
succeeds.

### S5 · Manual blocks (FR-008/010)
Click a free cell → create a block ("Almuerzo", 30 min): it appears on the calendar. Open the public
booking screen for the same date: that time slot is disabled.

### S6 · Block conflict (FR-009)
Clicking/creating on a cell already holding a booking or block is rejected; a block modal offers
`[Eliminar Bloqueo]` to free the slot.

### S7 · Persistence (FR-011)
In demo mode, reload keeps the week's bookings and blocks. (Production repeats against Supabase with
`0003` applied.)

### S8 · RLS check
With `0003_time_blocks.sql` applied, an anonymous client can *read* blocks (so the public form hides
them) but cannot insert/delete them; an authenticated operator can.

### S9 · Build & type gates (FR-013 / SC-005)
`npx astro check` and `npm run build` complete with **zero errors and zero warnings**.

### S10 · Tokens & responsive (FR-012 / SC-004)
No raw hex outside `tokens.css`; page has no horizontal scroll; the calendar scrolls internally at
320px; modals labeled with `Escape`/backdrop close.

## Expected Overall Outcome

`astro check`/`build` exit 0; S1–S10 pass; the calendar is the admin's default agenda view; blocks
propagate to public availability; all writes persist and honor slot exclusivity.