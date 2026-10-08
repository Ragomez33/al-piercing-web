# Admin UI Contract: Login & Session (replaces PIN)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Backed by [`data-model.md`](../data-model.md).

## 1. Boot State Machine (in `AdminPanel.svelte`, `client:load`)

- On mount: `if (!isSupabaseConfigured())` → **notice** (configuration-required); otherwise
  `getSession()` and render **DASHBOARD** or **LOGIN**.
- Subscribe once to `onAuthStateChange`: `null` → LOGIN, user → DASHBOARD. Unsubscribe on destroy.

## 2. LOGIN Screen

- Card on charcoal surface (`--bg-card-light`) over `--bg-app-body` `#111113`, gold accent
  (`--accent-primary` `#E5A93C`), `--shadow-glow`; max-width ~420px, centered.
- Fields: **Email** (`type="email"`, `autocomplete="username"`), **Contraseña**
  (`type="password"`, `autocomplete="current-password"`).
- Button: **Ingresar** (`--accent-primary`, `--accent-on`, `rounded-full`, ≥ 44px, disabled while
  submitting).
- Inline validation: empty/malformed fields → message per field, no submit.
- Provider error → `p class="error" role="alert"` with the ERR-01 message.
- While the provider is not configured, the LOGIN screen is NOT shown — the notice is.

## 3. DASHBOARD Header

- Reuse the existing tabs bar; the header shows the signed-in email plus **`[Cerrar Sesión]`**
  (ghost button) that calls `signOut()` and, on success, returns the panel to LOGIN (FR-007).
- The `[Cerrar Sesión]` control is always visible in DASHBOARD; after logout no admin data renders
  (FR-008).

## 4. Configuration-Required Notice

- Rendered when `isSupabaseConfigured() === false`: short title, one-line explanation ("El panel
  requiere Supabase configurado (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY)"), dark/gold tokens.
- No login form, no dashboard, no fake session (feature 004's PIN behavior is removed).

## 5. Visual & Accessibility Rules

- Tokens only; labels + `aria-invalid`/`aria-describedby` on error; `role="alert"` for auth errors;
  visible focus; ≥ 44px targets; no horizontal scroll at 320px.