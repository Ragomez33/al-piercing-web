# Phase 1 Data Model: Dark Luxury UI Redesign

This feature is **presentation/layout only**. It introduces no persisted entities, no schema changes and no
changes to the `DataStore`/domain types. The "model" below is the **UI structural model** the redesign
establishes: the shapes, presentation attributes and interaction states that the contracts reference.

> No database migrations, no `src/lib/types/*` changes, no data-access changes.

## Entity: PublicHeader

The app-wide top navigation bar on public routes (rendered by `AppHeader.astro`, hidden on `/admin`).

| Attribute | Type | Rules |
|-----------|------|-------|
| `brand` | string | From `STUDIO_PROFILE.brand` (`ALPIERCING`). |
| `logo` | asset | From `BRAND_LOGO`; blended over the dark surface. |
| `items` | `NavigationItem[]` | From `NAV_ITEMS`: Inicio (`/`), Catálogo (`/catalog`), Reservar (`/booking`). |
| `activeHref` | `Route \| null` | Derived from the current pathname (FR-005). |
| `pinned` | boolean | Always true on public routes (`position: sticky; top: 0`). |
| `surface` | token ref | Translucent dark + backdrop blur + bottom divider. |

**Interaction states**

- **At rest** (`top: 0`): full-width bar visible over content.
- **Scrolled**: bar stays pinned; content scrolls beneath it.
- **Link active**: current destination shows an accent (gold) treatment + `aria-current="page"`.
- **Link hover/focus**: gold text + subtle surface tint; focus ring visible.

## Entity: FormControlAppearance

The shared visual treatment of every `input`/`select`/`textarea` (global `.input` skin in `tokens.css`).

| Attribute | Type | Rules |
|-----------|------|-------|
| `surface` | token ref | Refined dark surface (`--bg-control`). |
| `border` | token ref | Defined, low-contrast border (`--border-control`). |
| `height` | token ref | `--control-min-height` (44px) — compact but ≥44px. |
| `padding` | token ref | `--control-padding` (`0.625rem 1rem`). |
| `fontSize` | token ref / value | `0.95rem`. |
| `focusBorder` | token ref | `--accent-primary`. |
| `focusRing` | token ref | Soft gold outer ring (`--accent-primary-glow`). |

**States**: rest · hover (optional, no behavior change) · **focus-visible** (gold border + soft ring) ·
disabled (muted, `not-allowed`). Validation/submission behavior is unchanged.

## Entity: FooterSection

The independent end-of-page section on public routes (rendered by `Footer.astro`).

| Attribute | Type | Rules |
|-----------|------|-------|
| `surface` | token ref | `--bg-footer`, full width, top divider. |
| `groups` | array (3) | (1) brand + short description, (2) quick links / socials, (3) FORGE Labs credits. |
| `socials` | link[] | Instagram + WhatsApp; ≥44px targets; external links `rel="noopener noreferrer"`. |
| `columns` | layout | 1 column (narrow) → 3 columns (≥ medium breakpoint). |
| `copyright` | string | `{brand} — © {year}`. |

**Layout states**: stacked (narrow) · three columns (wide). No interaction state machine beyond link
hover/focus.

## Entity: AdminShell

The dashboard chrome wrapping the authenticated admin content (rendered by `AdminPanel.svelte`).

| Attribute | Type | Rules |
|-----------|------|-------|
| `brand` | string | "ALPIERCING Admin" + logo. |
| `sections` | array (2) | Calendario (`calendar`), Inventario (`catalog`) — with icons. |
| `activeSection` | `"calendar" \| "catalog"` | Mirrors the existing `tab` state and `?tab=` query sync. |
| `user` | `{ email, mode }` | Signed-in email + data mode badge. |
| `logout` | action | Existing `signOut()` flow (unchanged). |
| `drawerOpen` | boolean | Runes state; only meaningful on small screens. |

**State transitions**

```
checking → (session?) → dashboard | login | notice
dashboard:
  activeSection: calendar ⇄ catalog      (switchTab, preserves ?tab= sync)
  drawerOpen: false ⇄ true               (small screens; toggle button, backdrop, Escape)
  → logout → login                        (existing flow; unchanged)
```

No persistence: `activeSection` is reflected in the URL query (existing behavior); `drawerOpen` is
ephemeral UI state (runes), never stored.

## Non-entities (explicitly unchanged)

- `Booking`, `ProductRecord`, `TimeBlock`, `PiercingService`, `NavigationItem` — no field changes.
- `DataStore` / adapters / `src/lib/services/*` — unchanged.
- Routes and page components (`index/catalog/booking/admin.astro`) — unchanged except the shared shell
  (`BaseLayout.astro`) hiding the public footer on `/admin`.
