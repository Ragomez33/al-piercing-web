# Auth & Session Contract: Admin Supabase Auth (replaces PIN)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Backed by [`data-model.md`](../data-model.md) and [`research.md`](../research.md).

## 1. Shared Supabase Client

```ts
// src/lib/data/supabase-client.ts
export function isSupabaseConfigured(): boolean;              // both PUBLIC_* env vars present
export function getSupabaseClient(): SupabaseClient;          // single shared instance
```
- Every `bookings`/`products` call and every auth call uses this one instance, so the authenticated
  session (Authorization header) is shared (spec §3, FR-009).

## 2. Auth Helpers

```ts
// src/lib/auth.ts — thin, typed wrapper; components never touch supabase directly
export async function getActiveSession(): Promise<{ user: { email: string } } | null>;
export async function signInWithEmailPassword(email: string, password: string): Promise<void>;
export async function signOut(): Promise<void>;
export function onAuthStateChange(handler: (email: string | null) => void): () => void;
```
- `signInWithEmailPassword` throws a typed error whose message comes from the ERR-01 mapping
  (`Credenciales incorrectas` / `No se pudo conectar. Intentalo de nuevo` / `Error de autenticación`).

## 3. Error Mapping

| Condition | Message |
| --- | --- |
| `Invalid login credentials` (auth/ invalid credentials) | `Credenciales incorrectas` |
| Network error / timeout | `No se pudo conectar. Intentalo de nuevo` |
| Anything else | `Error de autenticación` |

## 4. Row Level Security (migration `0002_admin_auth.sql`)

| Operation | Anonymous | Authenticated |
| --- | --- | --- |
| select `products` | only `published = true` | all rows |
| insert `products` | — | ✓ |
| update `products` | — | ✓ |
| select `bookings` | ✓ (slot availability) | ✓ |
| insert `bookings` | ✓ (client booking, `PENDING`) | ✓ |
| update `bookings` | — | ✓ (status transitions) |

If RLS rejects an admin write, the data layer throws a typed `DataError` and the UI shows it inline
(no false success).