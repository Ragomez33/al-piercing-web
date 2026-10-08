# ALPIERCING — System Design & UI Guidelines

**Version:** 4.0.0 (Dark Premium — Charcoal Black · Neon Gold · Wood)
**Scope:** Global (UI/UX)
**Status:** Binding — governed by `constitution.md` §1.2

---

## 0. Domain & Modules

ALPIERCING is a **static web app for a professional piercing & body-jewelry studio**. It
combines a public-facing showcase (landing, catalog, booking) with a private operations panel for
the studio (admin). These are the only modules of the product (governance §1.1):

| Module | Purpose | Route | Status |
| --- | --- | --- | --- |
| `landing` | Hero del estudio de piercing, bio, menú de servicios estilo Setmore, galería de trabajos y bloque de proceso | `/` | Implemented |
| `catalog` | Catálogo de argollas y labrets de titanio, joyería zirconia/navel y kits de aftercare con carrito flotante y checkout pre-llenado a WhatsApp | `/catalog` | Implemented |
| `booking` | Flujo de reserva: selección de servicio, selector de fecha/hora, datos del cliente y cálculo automático del 50% de seña con salida a WhatsApp | `/booking` | Implemented |
| `admin` | Panel privado protegido por login (Supabase Auth) con pestañas **Calendario** (grid semanal de citas por duración, modal con Confirmar Seña/Reagendar/Cancelar, bloqueos de horario) e **Inventario** (stock inline, publicar/ocultar, alta de productos) sobre la capa híbrida de datos | `/admin` | Implemented |

> **History:** v1.x of this document described **Foundly POS** (a local-first point-of-sale app).
> v2.0.0 re-labeled it as *Tattoo Art* but kept a React Native/Gluestack description that never
> matched this repository. v3.0.0 aligned the design system with the **actual Astro + Svelte**
> implementation. **v4.0.0** replaces the Clean Light (lavender/white) palette with the client's
> **Dark Premium** identity — charcoal black surfaces, backlit neon-gold accents and warm wood
> secondary — extracted from the physical ALPIERCING stand.

---

## 1. Core Philosophy & Aesthetic
- **Style:** Dark Premium UI (Charcoal Black + Neon Gold + Wood).
- **Vibe:** Nocturnal, luxurious and high contrast — matte black surfaces with backlit gold light,
  like a showcase in a dim studio. The jewelry is the protagonist.
- **Card System:** Cards with matte charcoal surfaces (`--bg-card-light`), thin industrial borders
  (`--border-card`) and deep shadows (`--shadow-card`) suspended over a near-black body, accented
  with warm neon-gold glows (`--shadow-glow`).
- **Two audiences, one system:** the **client experience** (landing → catalog → booking) and the
  **studio experience** (admin) share the exact same tokens; only density, hierarchy and available
  actions change.

---

## 2. Color Tokens & Palette

The single source of truth is [`src/styles/tokens.css`](./src/styles/tokens.css). Components MUST
consume `var(--token)`; raw hex/rgba is allowed **only** inside `tokens.css`.

### Backgrounds & Structure
- `bg-app-body`: `#111113` — near-black body.
- `bg-card-light`: `#1A1A1E` — base surface for cards, drawers and panels (charcoal).
- `bg-surface-elevated`: `#242429` — elevated surfaces (inputs, image containers, chips).
- `bg-badge-pill`: `#202024` — pill/chip background.
- `bg-pill-hover`: `#2A2A31` — hover/active tint for pills and nav links.
- `border-card`: `1px solid #2E2E36` — thin industrial border.
- `bg-gradient-top-start` / `bg-gradient-top-end`: `rgba(229, 169, 60, 0.14)` /
  `rgba(17, 17, 19, 0)` — a warm gold sheen on the top region that fades into the body.
- `overlay-backdrop`: `rgba(0, 0, 0, 0.65)` — the overlay behind modals/drawer.

### Backlit Gold Accents (Neon Gold)
- `accent-primary` (CTAs, FAB, selected states): `#E5A93C` — backlit neon gold.
- `accent-primary-hover`: `#F3B94F` — brighter gold on hover.
- `accent-primary-glow`: `rgba(229, 169, 60, 0.25)` — projected gold glow (used by
  `--shadow-glow` on primary CTAs and the cart FAB).
- `accent-on`: `#111113` — dark text/icon color on gold-filled surfaces (contrast).

### Warm Wood Secondary
- `accent-wood`: `#B87A4B` — warm wood tone.
- `bg-wood-pill`: `rgba(184, 122, 75, 0.15)` — translucent wood pill used for secondary labels.

### Status Indicators
- `accent-positive` (Confirmado / Seña recibida): `#34D399`.
- `accent-gold` (Pendiente por validar / stock bajo): `#E5A93C`.
- `accent-negative` (Cancelado / agotado): `#F87171`.
- **Booking status badges (feature 009)** — semantic aliases over the palette above; components
  consume these, never raw hex:
  - `status-pending-bg` / `status-pending-edge`: amber/orange (`bg-wood-pill` + `accent-gold`).
  - `status-confirmed-bg` / `status-confirmed-edge`: green-gold (`accent-positive-tint` + `accent-gold`).
  - `status-cancelled-bg` / `status-cancelled-edge`: red/muted (`accent-negative-tint` + `accent-negative`).

### Typography & Text
- `text-primary`: `#F4F4F5` — maximum readability on dark surfaces.
- `text-secondary`: `#A1A1AA` — labels and subtitles.
- `text-muted`: `#71717A` — lower-hierarchy text and disabled states.
- `text-gold`: `#E5A93C` — brand/display text (header wordmark, section eyebrows).

### Geometry & Elevation
- `radius-card`: `16px` · `radius-image`: `14px` · `radius-pill`: `9999px`.
- `border-card`: `1px solid #2E2E36`.
- `shadow-card`: `0 8px 24px rgba(0, 0, 0, 0.45)`.
- `shadow-glow`: `0 8px 24px var(--accent-primary-glow)`.

### Layout, form-control & layer tokens (feature 010)
- Header glass: `bg-navbar-glass` (`rgba(17,17,19,0.9)`) + `blur-navbar` (`12px`).
- Footer surface: `bg-footer` (`#0A0A0C`).
- Form controls: `bg-control` (`#18181B`), `border-control` (`1px solid rgba(255,255,255,0.15)`),
  `control-padding` (`0.625rem 1rem`), `control-min-height` (`44px`), `control-font-size` (`0.95rem`).
- Stacking layers: `z-header` (`30`) < `z-overlay` (`40`) < `z-modal` (`41`).

### Decorative background
- `--ink-blob-core` / `--ink-blob-accent` / `--ink-blob-transparent` drive the canvas ink-motion
  sprite in `InkBackgroundCanvas.svelte` (gold/wood glows on near-black), which reads them at
  runtime via `getComputedStyle` and respects `prefers-reduced-motion`.

---

## 3. Layout & Header Architecture

### App shell (`BaseLayout.astro`)
- Global styles imported from `tokens.css`; `lang="es"`.
- Fixed, non-interactive decorative layers: the ink canvas and the top gradient (both layer `0`,
  height `34vh`). `<main>` has **no numeric `z-index`** so overlays inside it are not trapped in a
  stacking context (feature 010).
- Layer tokens: `--z-header: 30` (sticky header/sidebar) < `--z-overlay: 40` (backdrop/drawer) <
  `--z-modal: 41` (modals/drawers). This guarantees existing modals always paint **above** the sticky
  chrome.
- The public footer renders on **public routes only**; `/admin` uses its own dashboard shell.

### Header (`AppHeader.astro`) — implemented
- **Full-width sticky top bar (feature 010)**: `position: sticky; top: 0` at `--z-header`, spanning the
  full viewport width with a translucent dark surface (`--bg-navbar-glass`),
  `backdrop-filter: blur(var(--blur-navbar))` and a thin `--divider-subtle` bottom border.
- **Layout**: centered container (`max-width: 1080px`) with the brand on the left and the navigation on
  the right, wrapping gracefully at 320px with no horizontal scroll.
- **Brand**: `STUDIO_PROFILE.brand` (`ALPIERCING`) in `--text-gold`, beside the logo
  (`BRAND_LOGO` → `/images/logo.png`, `mix-blend-mode: screen`) at the left.
- **Navigation**: pill links for `NAV_ITEMS` — Inicio (`/`), Catálogo (`/catalog`),
  Reservar (`/booking`); targets ≥ 44px; the active destination is computed from the route and shown
  with `aria-current="page"` plus a gold fill (`--accent-primary`/`--accent-on`).
- **Rendering scope**: renders ONLY on public routes; `/admin` uses the dashboard shell.

### Button system (feature 008)
- `btn-primary`: `--accent-primary` fill, `--accent-on` text (weight 600), `--radius-btn` (12px),
  hover `translateY(-1px)` + `--glow-btn-primary`.
- `btn-secondary`: `--bg-btn-secondary`, `--border-btn-secondary`, hover `--border-btn-secondary-hover`.
- Pill radius (`--radius-pill`) is preserved for nav links, the FAB, calendar slot pills and badges.

### Filters & selectors
- **Category pills** (catalog): `--bg-badge-pill` background, `--text-secondary` text,
  `rounded-full`; the active pill uses `--accent-primary` with `--accent-on` text.
- **Date input** (booking): `--bg-surface-elevated`, `--border-card`, `--radius-image`.
- **Date Filters (From/To, admin)**: reserved for the future admin bookings view; same surface
  tokens as the date input.

### Form controls (shared) — implemented (refined by feature 010)
- Every `input`, `select` and `textarea` in the app carries the global `.input` class (defined in
  `tokens.css`) and therefore shares one skin: `--bg-control` surface (refined charcoal),
  `--border-control` (defined `rgba(255,255,255,0.15)` border), `--radius-image`,
  `padding: var(--control-padding)` (`0.625rem 1rem`),
  `min-height: var(--control-min-height)` (`44px` — compact but never below the tactile minimum),
  `font-size: var(--control-font-size)` (`0.95rem`) and `color-scheme: dark` (native date pickers and
  select menus follow the dark surface).
- **Focus**: a soft gold state — `border-color: var(--accent-primary)` plus an outer
  `box-shadow: 0 0 0 3px var(--accent-primary-glow)` ring — replaces the hard outline.
- Label groups use the global `.field` class (flex column, `--text-secondary`, weight 600); the
  control may be nested inside the label (booking) or referenced via `for` as a sibling (admin) —
  the visual result is identical.
- This removes the per-component `.field input` / `.field select` duplication that previously
  failed to match sibling controls in the admin panel and made them fall back to the native skin.

### Footer (`Footer.astro`) — implemented (redesigned by feature 010)
- An **independent, full-width** section (`--bg-footer`, near-black) with a `--divider-subtle` top
  border and generous padding.
- A centered CSS grid with **three groups**: brand/logo + short description · quick links / social
  channels (Instagram + WhatsApp with inline icons, ≥44px targets) · FORGE Labs signature + credits,
  plus a brand/year line under a divider.
- **Responsive**: one column on narrow viewports → three columns (`1.5fr 1fr 1fr`) from `768px`, with no
  horizontal page scroll.

### Admin shell (`AdminPanel.svelte`) — implemented (redesigned by feature 010)
- The authenticated dashboard is a two-region workspace: a **left sidebar** and a **main content area**
  (`flex: 1`, ample padding).
- **Sidebar** (`position: sticky; top: 0; height: 100vh`, fixed width `256px`, right `--divider-subtle`
  border) with "ALPIERCING Admin" at the top, a vertical **Calendario / Inventario** nav (lucide icons,
  refined hover, **gold active** state), and — at the bottom — the mode badge, the signed-in email and
  `Cerrar Sesión`.
- **Small screens (<768px)**: the sidebar becomes an off-canvas drawer toggled by an accessible button
  (`aria-expanded`/`aria-controls`), with a backdrop, focus management and `Escape` to close; the main
  content is not pushed off-screen.
- Data actions, the `?tab=` sync and the auth gate are unchanged; the public footer is not rendered on
  `/admin`.
- **Product image upload**: the "Nuevo Producto" modal uses a file picker (`accept="image/*"`) with a
  live thumbnail preview and an inline "Subiendo imagen…" busy state. Uploads are delegated to
  `src/lib/services/storage.ts` (components never call Supabase Storage directly); production uploads go
  to the public `products` bucket and return `getPublicUrl()`, while demo mode inlines the image as a data
  URL. The file-picker button reuses the gold accent (`--accent-primary`/`--accent-on`).

---

## 4. Visual Grammar & Card Standards

- **Corner radius:** standard cards `--radius-card` (16px); badges/pills `--radius-pill`;
  FAB `--radius-pill`.
- **Card styling:** `background: var(--bg-card-light)`; `border: var(--border-card)`;
  `box-shadow: var(--shadow-card)`.
- **Icon boxes:** circular, `--bg-badge-pill` background with `--accent-primary` icon.
- **Typography rules:**
  - **Prices / figures** (CTAs and totals): `font-variant-numeric: tabular-nums`, weight `700`;
    values stored/rendered as integer cents.
  - **Positive amount** (Confirmado / Seña recibida): `--accent-positive`.
  - **Negative amount** (Cancelado / no disponible): `--accent-negative`.

### Service Menu (Landing) — implemented
- Grouped by the stand categories `NOSTRIL`, `HELIX`, `NAVEL`, `TITANIO`, each with its descriptor
  (e.g. *Piercing de Nariz*) shown as a muted sublabel.
- Each row is a card-style link (`/booking?service={id}`) with service name, description,
  duration + deposit hint and right-aligned price (`tabular-nums`, Bold).
- Hover/focus lifts the row and applies the gold accent border + focus ring; primary CTAs use
  `box-shadow: var(--shadow-glow)` (derived from `--accent-primary-glow`).

### Time Slot Selector (Booking) — implemented
- Wrapping grid of pills grouped under a "Horario disponible" legend.
- **Available:** `--bg-badge-pill` background, `--text-primary` text, `--border-card`.
- **Selected:** `--accent-primary` background with `--shadow-glow`, `--accent-on` text
  (`aria-pressed="true"`).
- **Unavailable:** `--bg-surface-elevated` background, `--text-muted` text, `disabled`.
- Times use `tabular-nums` (`14:30`).

### Booking Success Panel (feature 009) — implemented
- Submitting the booking form **persists first**; WhatsApp no longer auto-opens. On success a
  modal panel (`role="dialog"`, `aria-modal`, labelled) shows the exact reassurance copy
  **"Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad."**
- The panel exposes a secondary **"Enviar comprobante / aviso por WhatsApp"** link
  (`--accent-primary` outline on transparent, gold fill on hover, ≥44px) and a primary
  **"Nueva solicitud"** dismiss button (`--accent-primary` fill, `--accent-on` text).
- The submitted date/time is added to the unavailable set immediately and the form is cleared.

### Admin Booking Status Badges & Actions (feature 009) — implemented
- Calendar cards and the detail modal render a status badge using the `status-*` tokens:
  `PENDING` → **Pendiente** (amber/orange), `CONFIRMED` → **Confirmado** (green-gold),
  `CANCELLED` → **Cancelado** (red/muted). Cancelled rows render muted in the grid.
- Only `PENDING` offers **Aprobar Cita** (`--accent-primary`); `PENDING`/`CONFIRMED` offer
  **Cancelar Cita** (`--accent-negative` outline). Buttons disable while an action is in flight.
- Approving a request produces a re-sendable **"Notificar confirmación por WhatsApp"** link
  (`--accent-primary` outline, ≥44px) for the client. Cancel releases the slot.

### Product Cards (Catalog) — implemented
- Square image tile (`--radius-image`, `--bg-surface-elevated`) with `data-fallback` (dark/gold
  product mock art).
- Padded body: product name (`--text-primary`), category chip (`--bg-badge-pill`, categories
  `Argollas & Labrets`, `Zirconia & Navel`, `Aftercare`) and price (`tabular-nums`, Bold).
- Add-to-cart: `rounded-full` `--accent-primary` "＋" carrying `data-add-to-cart`.
- **Low/empty stock:** amber-gold `--accent-gold` "Pocas unidades" pill when `0 < stock ≤ 5`; the
  add action is replaced by an "Agotado" chip at `stock = 0`.

### Gallery Tiles (Landing) — implemented
- 2-column (mobile) → 4-column (desktop) grid of `--radius-card` image tiles over
  `--bg-card-light` with the standard border.
- Category label pill (`--bg-badge-pill`) overlaid bottom-left. Images use `data-fallback` so a
  missing asset degrades to the placeholder without breaking the grid.

### Appointment Rows (Admin) — planned
- One-line compact rows per appointment: client, service, date/time, deposit status badge
  (`Confirmado` / `Pendiente por validar` / `Cancelado`) and a receipt-validation detail.
- Layout: icon box (`--bg-badge-pill` + `--accent-primary`) → title + subtitle (`--text-secondary`)
  → right-aligned status pill + `tabular-nums` figure.
- Deposit line shows `Seña (50%)` plus the amount; the remaining `50%` appears as a muted `Saldo`.

### Cart Drawer (Catalog) — implemented
- FAB (`64px`, `--accent-primary`, `box-shadow: var(--shadow-glow)`) with an item-count badge
  (`--accent-negative` background, `--text-primary` text), hidden at 0.
- Drawer panel on `--bg-card-light` over `--overlay-backdrop`; line list with `＋/－`, remove and
  clear actions; footer totals (`tabular-nums`, `aria-live`).
- Preferred payment pills (`Pago Móvil` default, `Binance Pay`, `Efectivo`) and a
  "Enviar Pedido por WhatsApp" checkout, disabled when the cart is empty.

---

## 5. Navigation

### Current implementation (Astro)
- **Root:** `/` (landing) with a sticky header and pill navigation. There is **no separate
  gallery route** — the gallery is a section on the landing page (`#galeria`).
- **Admin:** reached only by typing `/admin`; it does not appear in the public nav.
- Primary actions:
  - Landing hero: **Reservar Turno (50% Seña)** → `/booking` and **Ver Catálogo de Joyería** →
    `/catalog`.
  - Landing menu: each service deep-links to `/booking?service={id}`.
  - Catalog: floating cart FAB opens the drawer; checkout builds the WhatsApp order message.

### Islands & `client:` directives (justification)
| Island | Directive | Module | Justification |
| --- | --- | --- | --- |
| `InkBackgroundCanvas` | `client:only="svelte"` | global | Decorative; runs only in the browser |
| `CartDrawer` | `client:load` | catalog | Owns all cart interactivity + checkout |
| `BookingFlow` | `client:load` | booking | Owns service/date/slot/form/deposit flow |
| `ProductCard` | *(none — SSR)* | catalog | Presentational; static grid |

---

## 6. Booking Lifecycle & Deposit Source of Truth

ALPIERCING separates the **appointment request/envelope** from the **deposit money trace**,
so the studio can always answer *"which slot is locked, and who paid the seña?"*:

| Concept | Table | Role |
| --- | --- | --- |
| Service catalog | `services` | The fixed piercing menu (id, name, category, price cents, duration, deposit flag). |
| Appointment envelope | `appointments` | The booked service: client, service, slot date/time, status and the 50% deposit expectation. |
| Deposit money trace | `deposit_payments` | Every unit of money received as seña (Binance Pay / Pago Móvil) plus its receipt reference. |
| Request intake | `booking_requests` | Pre-confirmation intake captured by the flow (service, requested slot, client data) before the studio approves. |

> **Current state:** this feature ships **without a backend**. The service catalog is static
> (`src/lib/data/services.ts`) and the booking flow produces a WhatsApp message only. The schemas
> below describe the planned PocketBase layer and are **not yet wired**.

### 6.1 `appointments` schema (planned)

- `status`: `PENDING` \| `CONFIRMED` \| `CANCELLED` (`Pendiente por validar` / `Confirmado` / `Cancelado`).
- `client_name`, `client_contact` (WhatsApp), `client_notes`.
- `service_id` / `service_name`: the booked piercing service (from `services`).
- `slot_at`: date + time of the chosen slot. A slot is **exclusive**: no two non-cancelled appointments may share the same `slot_at`.
- `deposit_cents`: integer cents, computed automatically as **50%** of the service price. Stored, never recomputed from float.
- `payment_method`: `BINANCE_PAY` \| `PAGO_MOVIL`.
- `receipt_ref` *(nullable)*: reference/URL of the uploaded comprobante.

### 6.2 `deposit_payments` schema (planned)

- `appointment_id`: FK → `appointments.id` (required).
- `amount_cents`: integer cents, always `> 0`.
- `payment_method`: `BINANCE_PAY` \| `PAGO_MOVIL`.
- `receipt_ref` *(nullable)*: uploaded comprobante image/reference.
- `validated_at` *(nullable)*: set when the studio approves. `null` ⇒ `Pendiente por validar`.
- `voided_at` *(nullable)*: auditable soft-delete; voided rows are excluded from all sums but stay visible with an `ANULADO` badge.

### 6.3 Write rules (planned, atomic, inside the parent transaction)

- `submitBooking()` (`bookingService`): creates the `appointments` row in `PENDING` and a linked `booking_request` in the **same transaction**. It does **not** lock the slot until the deposit is validated.
- `attachReceipt()`: links the uploaded comprobante to the appointment (`receipt_ref`) and creates a `deposit_payments` row with `validated_at = null`.
- `approveDeposit()`: sets `validated_at` on the `deposit_payments` row and flips `appointments.status` to `CONFIRMED` in the **same transaction**; the slot becomes exclusive from this moment.
- `rejectDeposit()`: sets `voided_at` on the `deposit_payments` row, flips `appointments.status` to `CANCELLED` and releases the slot.
- `cancelAppointment()`: auditable soft-delete — sets `voided_at` on the linked `deposit_payments`, sets `appointments.status = CANCELLED` (no physical delete). Voided rows stay visible with an `ANULADO` badge.
- **WhatsApp checkout** (catalog **and** booking): builds a pre-filled message (items or booking details) and opens `wa.me`; no server call is required.

### 6.4 Anti double-counting rule

Only **validated, non-voided** deposits count as collected money. The metrics that read
`appointments` and `deposit_payments` reconcile as follows:

- `getDepositTotals()` — sums `deposit_payments.amount_cents` where `validated_at IS NOT NULL` **and** `voided_at IS NULL`. Pending and voided deposits are excluded.
- `getSlotAvailability()` — a slot is occupied only by appointments whose `status = 'CONFIRMED'`; `PENDING` appointments never block a sibling request.
- `getAdminSummary()` — `collected` comes exclusively from `deposit_payments`; it **never** re-reads `appointments.deposit_cents` for the money total (that column is the computed expectation, not the ledger).

The invariant: **an appointment is `CONFIRMED` if and only if it has at least one validated,
non-voided deposit** of its `deposit_cents` expectation. Slots, receipts and totals are always
derived from this single source of truth.
