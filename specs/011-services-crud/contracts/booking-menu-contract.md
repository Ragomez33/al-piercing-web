# Contract: Public Booking Service Menu

**Feature**: 011-services-crud

Governs how `src/components/booking/BookingFlow.svelte` obtains and renders the service menu.

## 1. Load sequence

1. On mount, call `dataStore.listServices()` (active only).
2. While the promise is pending, show a short, polite loading hint (e.g. "Cargando servicios…",
   `aria-live="polite"`).
3. On success, render the list; on empty result, render an elegant empty state
   ("No hay servicios disponibles por el momento.").
4. Resolve a `?service=<id>` deep link **after** the list loads (select the matching service if present).

## 2. Rendered list

- One selectable card per active service (same visual language as today): name, category chip,
   description, duration (`{n} min`), "Requiere seña" hint and price (`formatCents`, `tabular-nums`).
- Selecting a service drives the rest of the flow; its `priceCents`, `durationMinutes` and
  `requiresDeposit` are the single source for the summary, deposit (50%) and slot duration.
- Only active services appear (inactive ones are never rendered).

## 3. Fallback on failure (demo parity)

- If the read **fails**, the component MUST fall back to the seed `PIERCING_SERVICES` (filtered to
  `active = true`) so the menu is never blank, and show a non-blocking notice (e.g. "No se pudo cargar la
  lista en línea; mostrando el menú local.").
- This is the "modo demo si la db no responde o da error" behavior; it applies in both demo and production.

## 4. Submission (unchanged)

- The submit handler keeps delegating to the booking domain service (`submitBookingRequest`); the booking
  stores a **snapshot** of `serviceId`/`serviceName`/`priceCents` at submit time, so later service edits do
  not rewrite existing bookings.

## 5. Invariants

- Money is integer cents; deposit is 50% of the price.
- Components do not call Supabase directly; all reads go through `dataStore`.
- No new island/hydration is added (`BookingFlow` stays `client:load`).
- Accented names/descriptions are preserved in the UI and in WhatsApp messages.
