# Research: Admin Supabase Auth (replaces PIN)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 0 (Outline & Research)

## 1. Single Shared Supabase Client

- **Decision**: A dedicated `src/lib/data/supabase-client.ts` owns the **one** `createClient` call
  (`getSupabaseClient()`), plus `isSupabaseConfigured()` that checks both `PUBLIC_SUPABASE_URL` and
  `PUBLIC_SUPABASE_ANON_KEY`. The production adapter reuses it instead of creating a client per call.
- **Rationale**: supabase-js persists the session in the browser's local storage and attaches it to
  every request via the Authorization header; a single instance guarantees the authenticated session
  is shared by Auth and the `bookings`/`products` queries (spec §3, FR-009).
- **Alternatives considered**: a fresh client per call (works because the session store is shared,
  but wastes instances and complicates `onAuthStateChange`); a server-side cookie proxy (needs an SSR
  runtime — out of scope for the static build).

## 2. Session Check & Reactive Updates

- **Decision**: On island mount, `getSupabaseClient().auth.getSession()` decides the initial view
  (login vs dashboard). A single `onAuthStateChange` subscription keeps the view in sync (sign-out,
  expiry, or new login) and is cleaned up on unmount.
- **Rationale**: `getSession()` answers "am I signed in?" at boot (FR-001); the subscription handles
  FR-006/FR-008 reactively without polling.
- **Alternatives considered**: polling `getSession()` (wasteful); trusting a one-shot check (misses
  expiry/logout).

## 3. Login Flow & Error Copy

- **Decision**: `signInWithPassword({ email, password })`; on error the provider's code/name is
  mapped to a stable Spanish message: `Invalid login credentials` → **"Credenciales incorrectas"**,
  network/timeout → "No se pudo conectar, intentalo de nuevo", unknown → "Error de autenticación".
  Empty fields are blocked inline (FR-002/003/004).
- **Rationale**: Deterministic, user-friendly copy in the project's language; never expose internal
  errors.
- **Alternatives considered**: echoing the raw provider message (leaks internals, inconsistent copy).

## 4. Row Level Security (authenticated writes)

- **Decision**: New migration `0002_admin_auth.sql` splits policies:
  - **anon (public)**: select published `products`; select `bookings` (slot availability); insert
    `bookings` (client booking).
  - **authenticated (admin)**: select all `products` (incl. unpublished); update `products`
    (stock/published); update `bookings` (status).
- **Rationale**: Keeps the public booking flow working while making admin writes require the
  session (FR-009); aligns RLS with the "shared authenticated session" requirement.
- **Alternatives considered**: keeping the 0001 permissive `for all` policies (writes would not be
  genuinely gated); a custom app_rls claim with per-user policy (overkill for a single operator).

## 5. Demo / Not-Configured Behavior

- **Decision**: When `isSupabaseConfigured()` is false, `AdminPanel` renders a **configuration-required
  notice** (dark/gold tokens) and never renders the login form or dashboard. The public pages keep
  their demo mode.
- **Rationale**: Real auth has no local substitute worth re-introducing (the spec explicitly replaces
  the PIN); failing loudly but cleanly is safer than fabricating an admin session.
- **Alternatives considered**: keeping a PIN fallback (explicitly rejected by the user);
  auto-signing a fake local user (security theater — rejected).

## 6. Config & Docs Cleanup

- **Decision**: Remove `ADMIN_PIN` (and its `PUBLIC_ADMIN_PIN` entry in `.env.example`); document
  that the admin operator is created in Supabase Auth (Dashboard → Authentication → Users / sign-up);
  update README/design-system admin notes.
- **Rationale**: Dead code and stale docs invite confusion; the spec states the PIN "deja de usarse".
- **Alternatives considered**: leaving `ADMIN_PIN` deprecated-but-present (unused surface, more
  attack surface).

## Design-Token Note

The login screen and navigation chrome MUST use the existing Dark Premium tokens — surfaces
`--bg-app-body` `#111113` / `--bg-card-light` `#1A1A1E` / `--bg-surface-elevated` `#242429`, brand
focus `--accent-primary` `#E5A93C`, `--shadow-glow`, and status tokens for errors
(`--accent-negative`). No raw values outside `tokens.css`.