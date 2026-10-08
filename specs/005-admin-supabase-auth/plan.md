# Implementation Plan: Admin Supabase Auth (replaces PIN)

**Branch**: `005-admin-supabase-auth` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-supabase-auth/spec.md`

## Summary

Replace the admin PIN gate with **real email/password authentication** against Supabase Auth. The
`AdminPanel` island gains a login screen (shown when no session exists) and a `[Cerrar Sesión]`
action; the data layer reuses a **single shared Supabase client** so every `bookings`/`products`
operation carries the authenticated session. When the provider is not configured, `/admin` shows a
clear configuration-required notice (no PIN fallback).

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5 (runes)

**Primary Dependencies**: `@supabase/supabase-js` (already installed in feature 004) — used for both
Auth and the production data adapter.

**Storage**: Session persistence handled by the provider (browser session store, standard local
storage). Data persistence unchanged (demo `localStorage` / Supabase tables).

**Testing**: `astro check` (0 errors/0 warnings) + `astro build` + manual scenarios in `quickstart.md`. No test framework (consistent with specs 001–004).

**Target Platform**: Modern evergreen browsers on static hosting.

**Project Type**: Web application (static pages + justified Svelte islands).

**Performance Goals**: One auth client; a single `onAuthStateChange` subscription; no per-action
client creation; no blocking of public pages.

**Constraints**: Token-only Dark/Gold styling; no secrets in the client build; admin requires the
provider (no PIN fallback); all admin writes execute under an authenticated session and RLS; the
public site keeps its demo-mode behavior.

**Scale/Scope**: Admin auth only. Public pages, booking availability and the catalog do not change.
No roles/permissions beyond "authenticated".

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands**: PASS. Auth/session state lives inside the already-existing
  `AdminPanel` island (`client:load`); no new island, no full-page client app.
- **Principle II — Token-Driven Styling**: PASS. Login screen and session UI consume `tokens.css`
  (charcoal `--bg-app-body`/`--bg-card-light`, gold `--accent-primary`, `--shadow-glow`); no Tailwind.
- **Principle III — Type-Safe by Default**: PASS. `AdminSession` mapped from `getSession()`,
  provider errors narrowed to typed messages; no `any`; boundary narrowing for RLS and env.
- **Principle IV — Booking & Financial Integrity**: PASS. Financial data stays integer cents; admin
  status changes now additionally require an authenticated session (stronger integrity).
- **Principle V — Mobile-First, Accessible**: PASS. Login fields labeled, error `role="alert"`,
  targets ≥ 44px, visible focus.
- **Data Access rule**: PASS. Components call `src/lib/auth.ts` and `src/lib/data/store.ts`; the
  Supabase client is confined to `src/lib/data/`.

No new gate violations (feature 004's documented deviations — Supabase as backend, `PENDING` slot
blocking — remain in force and are not modified).

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-supabase-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── admin/
│       └── AdminPanel.svelte        # REPLACED gate: login screen / session UI / sign out
├── lib/
│   ├── auth.ts                      # NEW: getSession / signIn / signOut / onAuthChange
│   ├── config.ts                    # EDIT: remove ADMIN_PIN (deprecated by this feature)
│   └── data/
│       ├── supabase-client.ts       # NEW: single shared Supabase client + isSupabaseConfigured()
│       ├── store.ts                 # unchanged
│       └── adapters/supabase.ts     # EDIT: reuse the shared client (authenticated session)
└── pages/admin.astro                # unchanged (hosts AdminPanel)
supabase/
└── migrations/
    ├── 0001_init.sql                # unchanged
    └── 0002_admin_auth.sql          # NEW: authenticated-only policies for admin writes
.env.example                         # EDIT: replace PUBLIC_ADMIN_PIN with auth notes
```

**Structure Decision**: Supabase client creation is centralized in `supabase-client.ts` so Auth and
the data adapter share one instance (and therefore the same session). Auth helpers sit in
`src/lib/auth.ts` (framework-agnostic). `AdminPanel.svelte` is the only UI that changes; the rest of
the app is untouched.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — new violations. (The admin now requires the provider configured; this is a deliberate
security decision recorded in the spec's Assumptions, removing the advisory PIN fallback introduced
in feature 004. RLS keeps public reads/inserts while restricting admin writes to authenticated
users.)

**Post-Design Re-check (after Phase 1)**: PASS — `data-model.md`, the contracts and `quickstart.md`
confirm: no dashboard data without a session, clear error copy, shared authenticated client, RLS
split (anon reads/inserts vs authenticated writes), token-only login UI, and the demo-mode notice
when the provider is not configured.