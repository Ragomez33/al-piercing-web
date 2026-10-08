# Data Model: Icon Branding, Navigation & Button System

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

> **Nature**: Visual/layout feature — no new persisted data. The "entities" below are
> configuration/UI contracts.

## Entities

### BRD-01 · BrandIcon
| Field | Type | Value |
| --- | --- | --- |
| `path` | constant | `"/images/logo.png"` (`BRAND_LOGO` in `src/lib/config.ts`) |
| `alt` | string | "ALPIERCING logo" |

Used by: favicon/apple-touch links, public dock (left), admin header, footer (small).

### NAV-01 · RouteRole
| Route | Public nav | Admin header |
| --- | --- | --- |
| `/`, `/catalog`, `/booking` | visible | — |
| `/admin` | hidden | visible (logo + "ALPIERCING Admin" + `[Cerrar Sesión]` + mode/email) |

### BTTN-01 · ButtonStyle
| Variant | Fill | Text | Radius | Hover |
| --- | --- | --- | --- | --- |
| `primary` | `--accent-primary` (#E5A93C) | `--accent-on` (#111113), weight 600/700 | `--radius-btn` (12px) | `translateY(-1px)` + `--glow-btn-primary` |
| `secondary` | `--bg-btn-secondary` | `--text-primary` | `--radius-btn` (12px) | border `--border-btn-secondary-hover` |
| pill (excluded) | — | — | `--radius-pill` (9999px) | nav links, FAB, slot pills, badges |

## Validation Rules (from FR)

- "The public navigation MUST NOT render on the admin route" (FR-001).
- "The capsule MUST place the brand/logo on its left; a white logo background MUST be blended away"
  (FR-005).
- "The site head MUST declare the brand icon as favicon and Apple touch icon" (FR-006).
- "All new colors/radii/shadows MUST be added as design tokens" (FR-011).

## State Transitions

- Route-based: public nav toggles purely by route (static SSR decision in `BaseLayout`).
- Hover states only (no persisted state).