# Feature Specification: Admin Supabase Auth (replaces PIN)

**Feature Branch**: `005-admin-supabase-auth`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implementa autenticación real con Supabase Auth en la sección `/admin` reemplazando el sistema de PIN por correo y contraseña. (1) Formulario de Login en `/admin`: si no hay una sesión activa (`supabase.auth.getSession()`), muestra una pantalla de Login estilizada con los tokens Dark/Gold (`#111113`, `#E5A93C`, `#1A1A1E`); campos Email y Contraseña; usa `supabase.auth.signInWithPassword({ email, password })`; muestra errores claros (ej. "Credenciales incorrectas"). (2) Gestión de sesión y cierre: al iniciar sesión correctamente, guarda la sesión y despliega el Dashboard (`bookings` y `catalog`); botón `[Cerrar Sesión]` que ejecute `supabase.auth.signOut()`. (3) Ajustar llamadas: el cliente de Supabase debe compartir la sesión autenticada al realizar actualizaciones a las tablas `products` y `bookings`."

> **Replaces**: the PIN gate (`ADMIN_PIN` / `sessionStorage` flag) introduced in feature
> 004-admin-bookings-store. After this feature, the PIN is unused.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Studio owner signs in with email & password (Priority: P1)

The studio owner opens the admin panel and, instead of entering a PIN, signs in with their email
and a password. If the credentials are valid, the dashboard (bookings and catalog) appears. If they
are invalid or the form is incomplete, the panel shows a clear error and stays locked.

**Why this priority**: Real authentication is the security gate of the whole admin module; without
it nothing protected should be reachable.

**Independent Test**: Open `/admin` while signed out → a login form (email + password) is shown and
no dashboard data is visible; sign in with valid credentials → the dashboard renders; with invalid
credentials → a clear error and no dashboard.

**Acceptance Scenarios**:

1. **Given** no active session, **When** the operator opens `/admin`, **Then** a login screen is
   shown and no admin data is visible.
2. **Given** the login form, **When** the operator submits valid credentials, **Then** the session is
   saved and the administrative dashboard appears.
3. **Given** the login form, **When** the operator submits invalid credentials, **Then** a clear error
   message (e.g. "Credenciales incorrectas") is shown and the dashboard stays hidden.

---

### User Story 2 - Session persistence and sign out (Priority: P2)

Once signed in, the operator can work across page reloads without signing in again while the session
is alive, and can explicitly close the session with a `[Cerrar Sesión]` button that returns the
panel to the login screen.

**Why this priority**: Comfortable, secure session management is required for daily use but builds
on the login flow.

**Independent Test**: Sign in, reload the page, and confirm the dashboard still renders without a new
login; press `[Cerrar Sesión]` and confirm the panel returns to the login screen and dashboard data is
no longer visible.

**Acceptance Scenarios**:

1. **Given** an active session, **When** the operator reloads the admin page, **Then** the dashboard
   renders without a new sign-in.
2. **Given** the signed-in dashboard, **When** the operator activates `[Cerrar Sesión]`, **Then** the
   session ends and the panel shows the login screen again.

---

### User Story 3 - Authenticated admin operations (Priority: P3)

All admin actions — reading and updating bookings and products — are executed under the
authenticated session, so the identity provider can authorize them. The same unified data layer keeps
working for reading/writing, but it must carry the active session on every request.

**Why this priority**: Separating trust from data is the operational reason for real authentication;
it is verified through the existing bookings/catalog workflows.

**Independent Test**: Sign in, then confirm/cancel a booking and edit a product's stock/published
state; verify the actions succeed only while authenticated and the changes persist.

**Acceptance Scenarios**:

1. **Given** an authenticated session, **When** the operator updates a booking or product, **Then**
   the change is applied and persisted.
2. **Given** no authenticated session, **When** the operator attempts to reach admin data, **Then**
   only the login screen is available and no update can be submitted.

### Edge Cases

- What happens when the form is submitted empty or malformed? Inline validation blocks it with a
  clear message; no request is made with empty values.
- What happens when credentials are wrong? A clear error is shown and the dashboard is not revealed.
- What happens when the session expires while the operator is working? The next protected action is
  rejected and the panel returns to the login screen (or shows a session-expired message).
- What happens when the site is built without the identity provider configured? The admin page shows
  a clear configuration-required notice instead of crashing.
- What happens when the operator presses `[Cerrar Sesión]`? The session ends immediately and the
  login screen returns; closing the tab after logout must not restore the dashboard.
- What happens with an already-active session while opening `/admin`? The dashboard renders directly
  without a login.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When there is no active session, the admin page MUST display a login screen (email +
  password) using the project's Dark/Gold tokens, and MUST NOT render any admin data.
- **FR-002**: The login form MUST validate credentials with the identity provider on submit.
- **FR-003**: Failed authentication MUST show a clear, user-facing error message (e.g.
  "Credenciales incorrectas") and keep the dashboard locked.
- **FR-004**: Empty or malformed input MUST be blocked client-side with a clear message before any
  authentication attempt.
- **FR-005**: Successful authentication MUST persist the session and immediately show the admin
  dashboard (bookings and catalog tabs).
- **FR-006**: The session MUST survive page reloads for its lifetime without a new login.
- **FR-007**: The admin header MUST include a `[Cerrar Sesión]` control that ends the session and
  returns the panel to the login screen.
- **FR-008**: After logging out, the admin dashboard data MUST NOT be visible again in that session.
- **FR-009**: All admin reads/writes for bookings and products MUST be performed under the
  authenticated session; unauthenticated attempts MUST be rejected.
- **FR-010**: When the identity provider is not configured at build time, the admin page MUST show a
  clear configuration-required message and never crash or render fake data.
- **FR-011**: The login and session UI MUST use the established Dark Premium design tokens and meet
  the project's accessibility bar (labels, focus states, ≥ 44px targets).
- **FR-012**: The project MUST build and type-check with zero errors and zero warnings.

### Key Entities *(include if feature involves data)*

- **AdminSession**: the authenticated state (email identity) that authorizes the admin module; has a
  login and logout lifecycle.
- **Credential check**: the validation of email/password carried out by the identity provider.
- **Booking / Product** *(existing)*: admin operations on these entities MUST run within an
  authenticated session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can reach the dashboard after a successful sign-in in at most 3 actions
  (open admin, type credentials, submit).
- **SC-002**: Invalid credentials never reveal the dashboard; a clear error is shown every time.
- **SC-003**: A reloaded session keeps the operator signed in for the session lifetime without
  extra steps.
- **SC-004**: Admin data writes succeed only with an active session; after logout they fail without
  exposing the dashboard.
- **SC-005**: The login screen follows the project's Dark/Gold visual identity and is usable at
  320px–1920px with no horizontal scroll.
- **SC-006**: The build and type-check gates finish with zero errors and zero warnings.

## Assumptions

- El admin utiliza **Supabase Auth con email/contraseña** (proveedor de identidad); el PIN deja de usarse.
- La sesión se persiste mediante el mecanismo estándar del proveedor (almacenamiento del navegador),
  lo que además hace que toda instancia del cliente comparta la misma sesión para las consultas.
- Cuando el sitio se compila sin el proveedor configurado, `/admin` muestra un aviso de configuración
  requerida (sin usar un respaldo local de PIN).
- Un único operador usa el panel; no se modelan roles ni permisos por usuario en esta entrega.
- El flujo previo de la capa híbrida (demo/producción) se mantiene; solo la autenticación del admin
  pasa a depender del proveedor.
- Los correos/contraseñas se crean y gestionan en el proveedor (fuera del alcance de esta entrega).