# Data Model: Landing Page & Base Layout

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

> **Nature**: This feature is **display-only**. None of the entities below persist; they form a
> typed static content model that backs the landing page and shell. No storage, migrations or
> write paths are introduced.

## Entities

### NAV-01 · NavigationItem
Represents a quick-link in the global header.
| Field | Type | Validation |
| --- | --- | --- |
| `label` | string (display) | REQUIRED, non-empty |
| `href` | string (route) | REQUIRED; MUST resolve to a known public route |

Source: FR-003 (quick navigation Inicio / Catálogo / Reservar).

### PRO-01 · StudioProfile
The studio identity shown in the hero and the header brand.
| Field | Type | Validation |
| --- | --- | --- |
| `brand` | string | REQUIRED, non-empty (header brand + hero identity) |
| `bio` | string (short) | REQUIRED; concise studio bio (1–3 sentences) |
| `location` | string | REQUIRED; studio location text |

Source: FR-001 (hero headline/bio/location).

### GAL-01 · GalleryItem
A highlighted work shown as a preview card in the gallery section.
| Field | Type | Validation |
| --- | --- | --- |
| `image` | asset reference | REQUIRED at runtime; missing asset MUST render a placeholder without breaking the grid (edge case) |
| `alt` | string | REQUIRED for accessibility |
| `label` | string | OPTIONAL; short label/category shown on the card |

Source: FR-007 (4 preview cards).

### PRC-01 · ProcessStep
One stage of the working flow.
| Field | Type | Validation |
| --- | --- | --- |
| `order` | integer | REQUIRED; 1–3, unique across the block |
| `title` | string | REQUIRED; fixed Spanish titles: Consulta y Diseño · Reserva con Seña (50%) · Perforación y Cuidados |
| `description` | string (short) | REQUIRED; newcomer-friendly explanation |

Source: FR-008 (process/trust block).

> **SVC-01 · PiercingService** (the landed service menu) is owned by the booking feature; see
> [`specs/003-booking-whatsapp/data-model.md`](../003-booking-whatsapp/data-model.md).

## Relationships

- `StudioProfile` → is shown in the hero (`index.astro`) and the header brand slot.
- `NavigationItem[]` → rendered by the header within `BaseLayout.astro` (shared across every page).
- `GalleryItem[]` → exactly 4 items rendered by the gallery section of `/`.
- `ProcessStep[]` → exactly 3 items rendered in fixed order by the process block.
- `PiercingService[]` → rendered statically by the service menu section of `/` (booking feature).

## Validation Rules (content-level)

- All title/label strings for the process block MUST match the canonical Spanish copy from FR-008.
- `NavigationItem.href` MUST point to existing routes per the [route contract](./contracts/ui-contract.md).
- Every `GalleryItem` MUST carry descriptive `alt` text.
- Card assets missing at runtime MUST fall back to a placeholder tile (grid integrity).

## State Transitions

None. Content is static (no create/update/delete, no workflows) in this feature.
