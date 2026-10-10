# Contract: Copy & Configuration

**Feature**: `015-landing-v2-ux-overhaul` | Global, user-facing.

## 1. Canonical terms

| Concept | Canonical | Accepted synonym | Forbidden |
|---------|-----------|------------------|-----------|
| Booking payment | **Adelanto** | Apartado | `Seña`, `seña` |
| Studio location | **El Tigre, Anzoátegui** | — | `CDMX`, `Ciudad de México` |
| Primary booking action | **Reservar mi cita** | — | `Reservar mi turno`, `Reservar Turno` |
| Booking noun | **cita** | — | `turno` (user-facing) |

The deposit amount/rule (50%, integer cents) is unchanged — only the words change (FR-015).

## 2. Required edits (exhaustive)

| File | From → To |
|------|-----------|
| `src/lib/types/content.ts` | `STUDIO_PROFILE.location`: `"Ciudad de México, CDMX"` → `"El Tigre, Anzoátegui"`; `PROCESS_STEPS[1]`: `"Reserva con Seña (50%)"` → `"Reserva con Adelanto (50%)"`, `"…el 50% de la seña."` → `"…el 50% del adelanto."` |
| `src/lib/config.ts` | `BUSINESS_ADDRESS` defaults: `addressLocality` `"Ciudad de México"`→`"El Tigre"`, `addressRegion` `"CDMX"`→`"Anzoátegui"`, `addressCountry` `"MX"`→`"VE"` |
| `src/pages/index.astro` | meta description `"…en CDMX…"` → `"…en El Tigre, Anzoátegui…"`; hero CTA `"Reservar Turno (50% Seña)"` → `"Reservar mi cita"`; `"Requiere seña"` → `"Requiere adelanto"`; `"Reservar mi turno"` → `"Reservar mi cita"` |
| `src/pages/booking.astro` | title/heading `"Reservar Turno"` → `"Reservar mi cita"`; description/paragraph `"seña del 50%"` → `"adelanto del 50%"` |
| `src/components/booking/BookingFlow.svelte` | `"Requiere seña"` → `"Requiere adelanto"`; `"Seña a abonar (50%)"` → `"Adelanto a abonar (50%)"`; `"Datos para abonar la seña"` → `"Datos para abonar el adelanto"`; `"Solicitar turno"` → `"Solicitar cita"` |
| `src/lib/utils/booking.ts` | `"Confirmamos tu turno"` → `"Confirmamos tu cita"` |
| `src/components/admin/AdminCalendar.svelte` | `"Seña (50%)"` → `"Adelanto (50%)"` |
| `src/components/admin/AdminPanel.svelte` | `"Requiere seña"` → `"Requiere adelanto"` |
| `src/components/landing/LandingV2Tabs.svelte` | Removed (tab island deleted); replacement copy uses "adelanto"/"cita" |
| `src/components/landing/LandingV2Sidebar.svelte` (new) | CTA reads `"Reservar mi cita"`; address reads `"El Tigre, Anzoátegui"` |

## 3. Verification

- A repository search for `Seña`/`seña`, `CDMX`, `Ciudad de México`, `Reservar mi turno` and
  `Reservar Turno` returns **no user-facing matches** (only this spec/plan/contract documentation may
  quote the terms).
- The structured-data/JSON-LD address reflects `El Tigre / Anzoátegui / VE`.

## 4. Acceptance mapping

FR-012, FR-013, FR-014, FR-015 → §1–§2. Verified by `quickstart.md` scenario 4.
