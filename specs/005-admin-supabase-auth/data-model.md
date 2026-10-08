# Data Model: Admin Supabase Auth (replaces PIN)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

> **Nature**: Authentication state lives on the provider (Supabase Auth). No new persisted
> collections other than the RLS policy change on the existing `bookings`/`products` tables.

## Entities

### ATH-01 · AdminSession
The authenticated admin state on the client.
| Field | Type | Validation |
| --- | --- | --- |
| `user` | identity (email) | present only after successful sign-in |
| `accessToken` | opaque token | managed entirely by the provider; attached to every request |
| `expiresAt` | timestamp | from the provider; short/medium-lived JWT with auto-refresh |

Rules: dashboard data visible ONLY when a session exists (FR-001/FR-005); session persists across
reloads (FR-006); sign-out clears it immediately (FR-007/FR-008).

### ATH-02 · CredentialIntent
Transient form input.
| Field | Type | Validation |
| --- | --- | --- |
| `email` | string | REQUIRED, non-empty, email-shaped |
| `password` | string | REQUIRED, non-empty |

### ERR-01 · AuthError
Mapped provider failure surfaced to the operator.
| Source condition | Message shown |
| --- | --- |
| Invalid login credentials | `Credenciales incorrectas` |
| Network / timeout / offline | `No se pudo conectar. Intentalo de nuevo` |
| Any other provider error | `Error de autenticación` |

### RLS-02 · Access split (policies)
| Entity | Anonymous (public) | Authenticated (admin) |
| --- | --- | --- |
| `bookings` | select (availability), insert (client booking) | select, insert, update (status) |
| `products` | select where `published = true` | select all, insert, update (stock/published) |

## Relationships

- `AdminSession` gates the whole admin module: the dashboard and every admin write depend on an
  active session.
- `AdminSession` → carried by the shared Supabase client → every `bookings`/`products` request
  (FR-009).
- `AuthError` derives from the sign-in attempt (ERR-01 mapping).

## Validation Rules (quoted from FR)

- "When there is no active session, the admin page MUST display a login screen … and MUST NOT render
  any admin data" (FR-001).
- "Failed authentication MUST show a clear error message … and keep the dashboard locked" (FR-003).
- "The session MUST survive page reloads for its lifetime" (FR-006).
- "All admin reads/writes for bookings and products MUST be performed under the authenticated
  session; unauthenticated attempts MUST be rejected" (FR-009).

## State Transitions

```
AdminPanel:
  boot → getSession()
          ├─ session? -> DASHBOARD
          └─ none ----> LOGIN
  LOGIN: submit(email, password)
          ├─ success -> session stored -> DASHBOARD
          └─ error   -> ERR-01 visible, stay on LOGIN
  DASHBOARD: [Cerrar Sesión]
          -> signOut() -> session cleared -> LOGIN
  (provider: session_updated / expired)
          -> onAuthStateChange -> DASHBOARD <-> LOGIN accordingly
```

- Admin writes (`confirm/cancel booking`, `update stock`, `toggle published`, `create product`) run
  only while `session` is non-null; provider rejects unauthenticated requests (RLS).
- The provider is not configured → a static notice replaces both LOGIN and DASHBOARD.