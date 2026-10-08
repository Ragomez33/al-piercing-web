# Quickstart Validation: Dark Luxury UI Redesign

End-to-end validation guide for the redesigned public shell, form controls, footer and admin dashboard.
Details live in [contracts/](./contracts/) and [data-model.md](./data-model.md).

## Prerequisites

- Node `>=22.12.0`, npm. Install deps: `npm install`.
- **Demo mode** (default): no env vars needed.
- **Production mode** (optional): set `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` and sign in at
  `/admin` to validate the authenticated shell.

## Setup / commands

```bash
npm run dev       # http://localhost:4321 (public: /, /catalog, /booking; admin: /admin)
npx astro check   # type gate — MUST be 0 errors (explicit user requirement)
npm run build     # static build MUST succeed
npm run lint      # eslint MUST be clean
```

## Scenarios

### S1 — Full-width sticky header (US1)
1. Open `/`, then scroll down.
2. **Expected**: a full-width translucent top bar with the brand on the left and "Inicio / Catálogo /
   Reservar" on the right with generous spacing; the bar stays pinned to the top and stays above page
   content while scrolling. (public-shell-contract §1/§2)

### S2 — Active navigation + routing (US1)
1. Visit each of `/`, `/catalog`, `/booking`.
2. **Expected**: the current destination is visually distinct (gold) with `aria-current="page"`; each link
   routes correctly; keyboard focus is visible on all links; targets ≥44px. (public-shell-contract §2)

### S3 — Header at 320px (US1 / FR-016)
1. Resize to 320px width on any public page.
2. **Expected**: brand and all three destinations remain usable; **no horizontal page scroll**.
   (public-shell-contract §2)

### S4 — Refined, compact form controls (US3)
1. On `/booking`, focus/type into the date field, the client name/WhatsApp fields and the notes area; open
   `/admin` and focus the login fields and (when signed in) the product form.
2. **Expected**: every control shares one refined dark surface with a defined border and a shorter
   height (still ≥44px); on focus, a soft gold border + outer ring appears; placeholder text is muted.
   Entry/validation/submission behavior is unchanged. (form-controls-contract §1–§3)

### S5 — Structured footer (US4)
1. Scroll to the bottom of `/`, `/catalog`, `/booking`.
2. **Expected**: a full-width section with a top divider and three groups — (1) brand + description,
   (2) Instagram/WhatsApp links with icons, (3) FORGE Labs credits — plus the brand/year line; the
   Instagram/WhatsApp links open the correct destinations. (public-shell-contract §3)

### S6 — Footer responsive (US4 / FR-016)
1. Resize to 320px, then to desktop width.
2. **Expected**: footer columns stack to one column on narrow width and show three columns on desktop; no
   horizontal page scroll. (public-shell-contract §3)

### S7 — Admin dashboard shell (US2)
1. Sign in at `/admin`.
2. **Expected**: a left sidebar with "ALPIERCING Admin", a vertical Calendario/Inventario nav, and — at
   the bottom — the mode badge, the signed-in email and **Cerrar Sesión**; the main area shows the
   calendar with ample padding. (admin-shell-contract §1)

### S8 — Active section + preserved actions (US2)
1. Switch to **Inventario** and back to **Calendario**; then perform an existing action (e.g., open a
   booking and approve it, or adjust a product's stock).
2. **Expected**: the active section is gold-highlighted and the `?tab=` query stays in sync; calendar and
   inventory actions and their modals work exactly as before. (admin-shell-contract §2/§4)

### S9 — Admin drawer on small screens (US2 / FR-016)
1. Resize `/admin` below the medium breakpoint.
2. **Expected**: the sidebar becomes a drawer opened by a labeled toggle (`aria-expanded`); focus moves
   into it; `Escape` and the backdrop close it; no horizontal page scroll at 320px. (admin-shell-contract
   §3)

### S10 — Overlay precedence (all stories / edge case)
1. With the page scrolled (header pinned), open the cart drawer on `/catalog`, the booking success panel on
   `/booking`, and an admin modal on `/admin`.
2. **Expected**: every overlay paints **above** the header/sidebar and remains fully interactive; nothing
   is clipped or covered. (public-shell-contract §4)

### S11 — Behavior & gates (FR-015/FR-018)
1. Re-run the previously working journeys: public navigation, booking submission (persist-first + success
   panel), admin login/logout, calendar actions and inventory management.
2. Run `npx astro check`, `npm run build`, `npm run lint`.
3. **Expected**: all journeys complete unchanged; **0 errors** / clean lint / successful build.

## Exit criteria

- All scenarios pass.
- `npx astro check` → **0 errors** (explicit user requirement).
- `npm run build` and `npm run lint` succeed.
- No new `client:*` directives; no Tailwind; raw values only in `src/styles/tokens.css`.
- `Booking`/`ProductRecord`/`DataStore` and the domain services remain the single shared types/behaviors.
