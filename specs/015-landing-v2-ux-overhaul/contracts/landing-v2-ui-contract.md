# Contract: Landing V2 Continuous UI

**Feature**: `015-landing-v2-ux-overhaul` | Applies to `src/pages/landing-v2.astro`,
`src/components/landing/LandingV2Services.svelte`, `src/components/landing/LandingV2Sidebar.svelte`,
`src/components/team/TeamSection.svelte`.

## 1. Page structure

- The page is a **single continuous scroll**; no tabs, no hidden panels, no `?tab=` state.
- The static Astro shell owns: the anchor top-bar, the booking-policy banner, the About section, the
  Gallery section and the Address/Contact section. It MUST NOT embed dynamic lists.
- Responsive grid:
  - `≥ 768px`: two columns — left `minmax(0, 1fr)` (scrolls) + right `340px` sticky card
    (`position: sticky; top: <header offset>`); container `align-items: start`.
  - `< 768px`: single column; the card flows **after** the content; no horizontal scroll at 320px.

## 2. Section order and anchors

| Nav label | Anchor id | Content |
|-----------|-----------|---------|
| Servicios | `#servicios` | `LandingV2Services` grouped accordion |
| Equipo | `#equipo` | `TeamSection` (reused) |
| Acerca de | `#acerca-de` | Studio description (`STUDIO_PROFILE.bio`) |
| Galería | `#galeria` | `GALLERY_ITEMS` mosaic |
| Reseñas | `#resenas` | Rating + `STUDIO_REVIEWS` (in the right card) |
| Dirección | `#direccion` | Address, hours and contact block |

Left-column DOM order: policy banner → `#servicios` → `#equipo` → `#acerca-de` → `#galeria` →
`#direccion`. Each nav item is an `<a href="#id">`.

## 3. Scrolling

- Smooth scroll via `html { scroll-behavior: smooth }`.
- `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }` (Principle V).
- Loading `/landing-v2#equipo` directly MUST land on/at the team section.

## 4. Sticky sidebar card

MUST display: studio logo/avatar (`BRAND_LOGO`); live status label of the form
`"Abierto • Cierra a las HH:MM"` or `"Cerrado • Abre a las HH:MM"`; the address
`"El Tigre, Anzoátegui"`; the rating/reviews indicator (`STUDIO_RATING`, anchor target `#resenas`); and
a prominent **"Reservar mi cita"** action linking to `/booking`.

MUST NOT contain redundant Instagram or WhatsApp actions (FR-006). Instagram/WhatsApp contact, if
shown anywhere on the page, belongs in the `#direccion` block only.

## 5. Services accordion

- Grouped by `PIERCING_SERVICE_CATEGORIES`; only `active` services are shown (via the data layer).
- Each row: name, description, duration, price, and a "Requiere adelanto" badge when
  `requiresDeposit`; the row/action starts `/booking?service=<id>`.
- Collapsible per group (native `<details>/<summary>` preferred) — accessible and keyboard-operable.
- Empty/loading: an elegant empty state ("No hay servicios disponibles por el momento.") when the list
  is empty; a non-blocking notice when a fallback content set is shown (reuse the feature-013 pattern).
- The label uses **"adelanto"**, never "seña" (copy contract).

## 6. State handling

- Data comes from the data layer only (`dataStore.listServices()`, `TeamSection` for team) with the
  existing local/demo fallback; components never call Supabase directly.
- Live updates (see `data-sync-contract.md`) patch the rendered list in place — no full-list teardown,
  no scroll jump.
- A read failure shows fallback content + a non-blocking notice; never a blank section.

## 7. Accessibility & styling

- One `<h1>` (brand), ordered `<h2>` per section, semantic landmarks.
- All interactive controls ≥ 44×44px; visible focus; async regions use `aria-live`/`aria-busy`.
- Tokens only (`tokens.css`): `--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`,
  `--shadow-glow`, `--text-*`; no raw hex; no Tailwind.
- Images use `loading="lazy"`, descriptive `alt`, and `/images/placeholder.svg` fallback.

## 8. Acceptance mapping

FR-001…FR-010, FR-020 → §1–§7. Verified by `quickstart.md` scenarios 1–6.
