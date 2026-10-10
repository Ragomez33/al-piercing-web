# Quickstart Validation: Team Members Module, Monthly Admin Calendar & Mobile UX

End-to-end validation for the three improvements. Details live in [contracts/](./contracts/) and
[data-model.md](./data-model.md).

## Prerequisites

- Node `>=22.12.0`, npm. Install deps: `npm install`.
- **Demo mode** (default): no env vars needed (team seed in `alpi:team:v1`).
- **Production mode** (optional): set `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY`, apply migration
  `0006_team_members.sql` (`supabase db push` or SQL editor), and sign in at `/admin`.

## Setup / commands

```bash
npm run dev       # http://localhost:4321 (landing /; admin: /admin?tab=team, ?tab=calendar)
npx astro check   # type gate — MUST be 0 errors (explicit user requirement)
npm run build     # static build MUST succeed
npm run lint      # eslint MUST be clean
```

## Scenarios

### S1 — Public team section renders managed members (US1)
1. Open `/` and scroll to "Nuestro Equipo / Artistas".
2. **Expected**: active members render with avatar (or placeholder), name, role and bio; members with an
   Instagram handle show a link that opens in a new tab. (team-ui-contract §1)

### S2 — Empty team hides the section (US1 / edge)
1. Deactivate every member (or start with an empty roster).
2. **Expected**: the landing shows no team heading/section and the rest of the page is unaffected.
   (team-ui-contract §1, FR-004)

### S3 — Admin Equipo list (US2)
1. Sign in, open `/admin` and choose **Equipo** (or `/admin?tab=team`).
2. **Expected**: all members are listed with avatar, name, role and active state; inactive members show an
   "Inactivo" chip. (team-ui-contract §2)

### S4 — Create a member with an avatar (US2)
1. Activate **Nuevo miembro**, fill name + role (+ bio/Instagram) and pick an image; submit.
2. **Expected**: the avatar uploads (or is inlined as a data URL in demo), the modal closes, the member
   appears in the list (generated UUID id), and it appears in the public section on the next load.
   (SC-001)

### S5 — Edit / deactivate (US2)
1. Edit a member's role/bio and save; then toggle the active switch off.
2. **Expected**: edits persist; the deactivated member disappears from the public section within one
   reload but stays visible (inactive) in admin. (SC-002)

### S6 — Delete a member (US2)
1. Delete a member through the confirmation dialog.
2. **Expected**: the member disappears from admin and from the public section. (team-ui-contract §2)

### S7 — Validation errors (US2)
1. Submit with an empty name or role.
2. **Expected**: a clear `role="alert"` message is shown and nothing is persisted.
   (team-ui-contract §2)

### S8 — Desktop monthly calendar (US3)
1. Open `/admin?tab=calendar` on a wide screen.
2. **Expected**: a monthly grid (Monday–Sunday, 42 cells) with appointment count/status badges on days
   that have appointments; a `[Hoy]` shortcut and previous/next month pager work.
   (calendar-ui-contract §2)

### S9 — Day detail & actions (US3)
1. Click a day with appointments.
2. **Expected**: the day detail lists appointments (time, client, service, status) and blocks; opening an
   appointment shows full details and offers **Aprobar / Cancelar / Reagendar**; each action persists and
   the month badges refresh. (calendar-ui-contract §3/§5)

### S10 — Blocks still work (US3)
1. On a selected day, create a new block (slot + label + duration); then delete it.
2. **Expected**: the block appears in the day detail and disables that slot in the public booking form;
   deleting frees it. (calendar-ui-contract §6)

### S11 — Mobile calendar (US4)
1. At a 360px viewport, open `/admin?tab=calendar`.
2. **Expected**: a horizontally scrollable day selector plus a vertical appointment list for the selected
   day with a clear service breakdown; no horizontal page scroll; selecting another day updates the list.
   (calendar-ui-contract §4, SC-005)

### S12 — Mobile navigation drawer (US5)
1. At ≤414px on any public page, tap the hamburger.
2. **Expected**: the drawer opens smoothly, closes on link selection / Escape / backdrop, restores focus,
   and locks body scroll while open. (responsive-ui-contract §1)

### S13 — No overflow at 320px (US5)
1. Set the viewport to 320px and visit `/catalog` (open the cart), then `/booking` (fill the form to the
   checkout step).
2. **Expected**: the product grid, cart drawer lines, deposit summary and submit button stay within the
   viewport; no horizontal page scroll. (responsive-ui-contract §2–§4, SC-005)

### S14 — Demo-mode persistence (US2 / edge)
1. Run without backend configuration; create/edit/deactivate a member; reload `/` and `/admin`.
2. **Expected**: changes persist in `alpi:team:v1` and are reflected in both surfaces. (SC-008)

### S15 — Read-failure fallback (US1 / edge)
1. In production mode, force the team query to fail.
2. **Expected**: the landing still shows the demo-seed team with a non-blocking notice instead of a blank
   section. (team-ui-contract §1)

### S16 — Regressions & gates
1. Re-run prior journeys: booking submit + success panel, catalog/cart checkout, admin Servicios CRUD,
   calendar approve/cancel/reschedule (service durations still correct).
2. Run `npx astro check`, `npm run build`, `npm run lint`.
3. **Expected**: all journeys unchanged; **0 errors**, clean lint, successful build. (SC-003, SC-006)

## Exit criteria

- All scenarios pass.
- `npx astro check` → **0 errors** (explicit user requirement); `npm run build` and `npm run lint` succeed.
- Only two new islands (`TeamSection` `client:visible`, `MobileNav` `client:load`), both justified; no
  Tailwind; data access only via `dataStore`/services; money stays integer cents; appointment transitions
  still go through `src/lib/services/booking.ts`.
- No horizontal page scroll from 320px to 1920px.
