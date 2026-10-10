# Quickstart Validation: Alternative Landing Page (`/landing-v2`)

End-to-end validation for the Dark Luxury × Setmore alternative landing. Details live in
[contracts/landing-v2-ui-contract.md](./contracts/landing-v2-ui-contract.md) and
[data-model.md](./data-model.md).

## Prerequisites

- Node `>=22.12.0`, npm. Install deps: `npm install`.
- **Demo mode** (default): no env vars needed (services/team fall back to the local seed).
- **Production mode** (optional): `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY`, with at least one
  active service and one active team member.

## Setup / commands

```bash
npm run dev        # http://localhost:4321/landing-v2  (compare with /)
npx astro check    # type gate — MUST be 0 errors (explicit user requirement)
npm run build      # static build MUST succeed
npm run lint       # eslint MUST be clean
```

## Scenarios

### L1 — Profile header renders (US1)
1. Open `/landing-v2`.
2. **Expected**: compact header with logo/wordmark, short description, address + opening hours,
   Instagram and WhatsApp links, and a **"Reservas Online 24/7"** badge. (contract §1)

### L2 — Tab switching (US2)
1. Click **Servicios**, then **Equipo**, then **Proceso & Galería**.
2. **Expected**: only the selected panel is visible; the active tab is clearly highlighted; no page
   reload. Default on first load is **Servicios**. (contract §2)

### L3 — Grouped service list (US1)
1. In the **Servicios** panel, review the groups.
2. **Expected**: services grouped by category (Nostril, Helix, …), each with name, duration, price and a
   **"Requiere seña"** badge when applicable; no empty groups. (contract §3)

### L4 — Direct booking (US1)
1. Click **Reservar** on any service.
2. **Expected**: navigates to `/booking?service=<id>` and the booking flow opens with that service
   pre-selected. (contract §6, FR-005)

### L5 — Team panel (US3)
1. Open the **Equipo** panel.
2. **Expected**: active members render with avatar (or placeholder), name and role/specialty; with no
   active members the panel shows nothing/elegant empty state and the page is unaffected. (contract §4)

### L6 — Process & Gallery (US3)
1. Open the **Proceso & Galería** panel.
2. **Expected**: the booking steps appear in order with a CTA to `/booking`; the featured photos render
   in a 2/4-column grid with placeholder fallback for missing images; no overflow. (contract §5)

### L7 — Empty services (edge)
1. In production, deactivate every service (or start empty).
2. **Expected**: the Servicios panel shows an elegant "No hay servicios disponibles" state; other panels
   and the page remain usable. (contract §3, FR-013)

### L8 — Read-failure fallback (edge)
1. In production mode, force the services query to fail.
2. **Expected**: the panel still shows the local/demo services with a non-blocking `role="status"`
   notice instead of a blank panel. (contract §3, FR-013)

### L9 — Responsive / no horizontal scroll (US1/US3)
1. Set the viewport to 320px, then 1920px; scroll `/landing-v2` and open each tab.
2. **Expected**: no horizontal page scroll at any width; tabs and service actions are ≥44px; long text
   wraps. (contract §7)

### L10 — Accessibility (US2)
1. Tab to the tablist; use Left/Right/Home/End to move between tabs and activate one.
2. **Expected**: roving focus works, the active tab announces `aria-selected`, focus is visible; with
   `prefers-reduced-motion: reduce` selected no tab transition plays. (contract §2/§7)

### L11 — Optional deep-link (US2)
1. Open `/landing-v2?tab=team`.
2. **Expected**: the page opens on the **Equipo** panel; switching tabs updates `?tab=` in the URL
   (behavior, not persistence). (contract §2)

### L12 — Regression & gates
1. Re-check the existing pages: `/` (unchanged content/behavior), `/catalog` + cart, `/booking` submit,
   `/admin` calendar/Equipo.
2. Run `npx astro check`, `npm run build`, `npm run lint`.
3. **Expected**: `/` is byte-for-byte behaviorally unchanged; all journeys still work; **0 errors**,
   clean lint, successful build. (SC-002, SC-004)

## Exit criteria

- All scenarios pass.
- `npx astro check` → **0 errors** (explicit user requirement); `npm run build` and `npm run lint` succeed.
- Exactly **one** new island (`LandingV2Tabs` `client:load`); no Tailwind; data access only via
  `dataStore`; the current `index.astro` untouched.
- No horizontal page scroll from 320px to 1920px.
