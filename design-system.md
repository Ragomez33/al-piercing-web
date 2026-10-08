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

### Decorative background
- `--ink-blob-core` / `--ink-blob-accent` / `--ink-blob-transparent` drive the canvas ink-motion
  sprite in `InkBackgroundCanvas.svelte` (gold/wood glows on near-black), which reads them at
  runtime via `getComputedStyle` and respects `prefers-reduced-motion`.

---

## 3. Layout & Header Architecture

### App shell (`BaseLayout.astro`)
- Global styles imported from `tokens.css`; `lang="es"`.
- Fixed, non-interactive decorative layers: the ink canvas (`z-index: 0`) and the top gradient
  (`z-index: 1`, height `34vh`). Content sits at `z-index: 2`.
- A `site-footer` renders the brand and current year.

### Header (`AppHeader.astro`) — implemented
- **Docked glass capsule (feature 008)**: the public header renders as a centered rounded pill
  (`max-width: 650px`, `margin-top: 1rem`, `border-radius: var(--radius-pill)`) with a dark glass
  surface (`--bg-navbar-glass`, `backdrop-filter: blur(var(--blur-navbar))`, `--border-glass`,
  `--shadow-dock`).
- **Brand**: `STUDIO_PROFILE.brand` (`ALPIERCING`) in `--text-gold`, beside the logo
  (`BRAND_LOGO` → `/images/logo.png`, `mix-blend-mode: screen`) at the left of the capsule.
- **Navigation**: pill links for `NAV_ITEMS` — Inicio (`/`), Catálogo (`/catalog`),
  Reservar (`/booking`); targets ≥ 44px.
- **Rendering scope**: the public header renders ONLY on public routes; `/admin` hides it and uses
  the admin panel header (logo + "ALPIERCING Admin" + `[Cerrar Sesión]`).

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

### Form controls (shared) — implemented
- Every `input`, `select` and `textarea` in the app carries the global `.input` class (defined in
  `tokens.css`) and therefore shares one skin: `--bg-surface-elevated` surface, `--border-card`,
  `--radius-image`, `padding: var(--control-padding)` (0.75rem 0.9rem),
  `min-height: var(--control-min-height)` (48px), `color-scheme: dark` (native date pickers and
  select menus follow the dark surface) and an `--accent-primary` focus ring.
- Label groups use the global `.field` class (flex column, `--text-secondary`, weight 600); the
  control may be nested inside the label (booking) or referenced via `for` as a sibling (admin) —
  the visual result is identical.
- This removes the per-component `.field input` / `.field select` duplication that previously
  failed to match sibling controls in the admin panel and made them fall back to the native skin.

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
