# Contract: Alternative Landing Page (`/landing-v2`) — Dark Luxury × Setmore

**Feature**: 013-landing-v2 · **Phase**: 1 (Design & Contracts)

A single static page (`src/pages/landing-v2.astro`) plus **one** Svelte island
(`src/components/landing/LandingV2Tabs.svelte`, `client:load`). The current landing (`index.astro`) is
unchanged. Data access is read-only through the shared `dataStore`.

## 1. Profile header (SSR, no JS)

Rendered statically by the page:

- **Identity**: brand logo (`BRAND_LOGO`) + wordmark (`STUDIO_PROFILE.brand`), `tagline`, and a compact
  `bio` (2–3 lines).
- **Meta**: address (`STUDIO_PROFILE.location`) and opening hours (page-local constant), each with a
  small icon (`lucide-svelte`), omitted when empty.
- **Social links**: **Instagram** (`https://instagram.com/alpiercing`, `target="_blank"`,
  `rel="noopener noreferrer"`) and **WhatsApp** (`https://wa.me/<WHATSAPP_PHONE>`); each ≥44px, labeled.
- **Status badge**: a pill reading **"Reservas Online 24/7"** using the gold accent tokens.
- Layout: centered card over the app body; single column, `clamp()` padding; no horizontal scroll at
  320px.

## 2. Tab widget (`LandingV2Tabs.svelte`)

- **Structure**: `role="tablist"` with three `role="tab"` buttons — **Servicios**, **Equipo**,
  **Proceso & Galería** — each `aria-selected`, `aria-controls="panel-<id>"`, `id="tab-<id>"`, and a
  `role="tabpanel"` per area (`aria-labelledby="tab-<id>"`, `hidden` when inactive).
- **Keyboard**: Left/Right arrows move focus between tabs; Home/End jump to first/last; activation
  switches the panel. Roving `tabindex` (active tab `0`, others `-1`). Visible focus ring.
- **Default**: `services`.
- **URL (optional enhancement)**: read `?tab=services|team|process` on mount; mirror the active tab with
  `history.replaceState`.
- **Styling**: pill tabs; active tab uses `--accent-primary` fill + `--accent-on` text + `--shadow-glow`;
  inactive uses `--bg-badge-pill` / `--text-secondary`; ≥44px.

## 3. Panel: Servicios

- Data: `dataStore.listServices()` on mount (active only); on failure fall back to
  `listFallbackServices()` with a `role="status"` notice; `role="alert"` only for unexpected errors.
- Loading: small `aria-live="polite"` hint. Empty: elegant "No hay servicios disponibles" state.
- Group by `PIERCING_SERVICE_CATEGORIES` (groups with no services omitted). Each group shows its label +
  descriptor; each **service row** (card) shows:
  - `name`, `description` (wrapped), `durationMinutes` ("⏱ N min"),
  - `priceCents` via `formatCents` (`tabular-nums`),
  - a **"Requiere seña"** badge when `requiresDeposit`,
  - a **`Reservar`** action rendered as an anchor to `/booking?service=<id>` (≥44px).
- Responsive: 1 column → 2 columns at ≥768px; `overflow-wrap: anywhere`; `min-width: 0`.

## 4. Panel: Equipo

- Renders the existing `src/components/team/TeamSection.svelte` (active members, avatars, role,
  specialty/bio, Instagram link, skeleton, fallback notice, empty → renders nothing). No duplication of
  team logic.

## 5. Panel: Proceso & Galería

- **Proceso**: ordered steps from `PROCESS_STEPS` (number + title + description), plus a primary CTA to
  `/booking` ("Reservar mi turno").
- **Galería**: `GALLERY_ITEMS` tiles (2 cols mobile → 4 cols desktop) with `data-fallback` placeholder and
  the existing `BaseLayout` broken-image script; `aspect-ratio: 1 / 1` so tiles never overflow.

## 6. Booking action

- Kept as navigation to `/booking?service=<id>` (the existing `BookingFlow` pre-selects it). The inline
  wizard variant is explicitly out of scope for this page.

## 7. Responsive, tokens & accessibility

- Tokens only (`--bg-card-light`, `--bg-badge-pill`, `--border-card`, `--accent-primary`,
  `--accent-on`, `--text-*`, `--radius-*`, `--shadow-glow`, `--divider-subtle`); raw hex appears only in
  `tokens.css`.
- `clamp()` spacing; no horizontal page scroll 320–1920px; `minmax(0, 1fr)` grids; ≥44px interactive
  targets; semantic HTML; labeled controls; visible focus; `prefers-reduced-motion` disables tab
  transitions and hover lifts.
- The section content area scrolls/sizes internally without thrashing the page layout.

## 8. Non-goals

- No changes to `index.astro`, catalog, booking or admin.
- No new data entities, tables, migrations or `DataStore` methods.
- No new runtime dependency; no Tailwind.
