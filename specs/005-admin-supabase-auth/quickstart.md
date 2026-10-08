# Quickstart: Admin Supabase Auth (replaces PIN)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Contracts: [auth](./contracts/auth-contract.md) · [admin UI](./contracts/auth-ui-contract.md) ·
Model: [data model](./data-model.md).

Runnable validation guide. Implementation details live in `tasks.md`.

## Prerequisites

- Node.js ≥ 22, deps installed (`npm install` already includes `@supabase/supabase-js`).
- Feature files: `src/lib/data/supabase-client.ts`, `src/lib/auth.ts`, `src/components/admin/AdminPanel.svelte`
  (login/session UI), `supabase/migrations/0002_admin_auth.sql`.
- A Supabase project with the migration applied and at least one admin user created
  (Authentication → Users, or sign-up enabled for dev).

## Setup & Commands

```bash
npm install
npx astro check   # exit 0, zero errors
npm run build     # exit 0
npm run dev       # open http://localhost:4321/admin
```

## Validation Scenarios

### S1 · Configuration-not-required notice (FR-010)
Build **without** `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY`. Open `/admin`: only the
configuration-required notice renders — no login form, no dashboard, no crash.

### S2 · Login screen when signed out (FR-001)
With Supabase configured and a user created, open `/admin` signed out: the email/password login
card is shown and no dashboard data is visible; the public pages still work in demo mode.

### S3 · Invalid credentials (FR-003/004)
Submit wrong credentials → inline error **"Credenciales incorrectas"** and the dashboard stays
hidden. Submit empty/malformed input → inline validation with no request.

### S4 · Valid sign-in reveals the dashboard (FR-002/005, SC-001)
Submit valid credentials → session saved and the bookings/catalog dashboard renders immediately.

### S5 · Session survives reload (FR-006, SC-003)
After signing in, reload `/admin`: the dashboard renders without a new login.

### S6 · Sign out (FR-007/008, SC-004)
Click `[Cerrar Sesión]`: the session ends, the login screen returns and admin data is no longer
visible (a reload after logout also shows the login screen).

### S7 · Authenticated admin operations (FR-009)
While signed in, confirm/cancel a booking and edit a product (stock/publish/add) → changes succeed
and persist. After signing out, the same actions are not reachable (login screen only).

### S8 · RLS / policy check
With migration `0002_admin_auth.sql` applied, confirm an anonymous browser cannot update a booking's
status or an unpublished product (provider rejects the write) while the public site can still read
published products and insert bookings.

### S9 · Build & type gates (SC-006 / FR-012)
`npx astro check` and `npm run build` complete with **zero errors and zero warnings**.

### S10 · Tokens & a11y
Login card uses the Dark/Gold tokens only; labels, `role="alert"` on errors, ≥ 44px targets, visible
focus; no horizontal scroll at 320px.

## Expected Overall Outcome

`astro check` and `astro build` exit 0; S1–S10 pass; no dashboard data without a session; admin
writes run under the shared authenticated session and RLS; the PIN gate is gone.