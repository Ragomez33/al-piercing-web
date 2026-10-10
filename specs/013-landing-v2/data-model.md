# Phase 1 Data Model: Alternative Setmore-Style Landing Page (Dark Luxury)

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-09 · **Phase**: 1 (Design & Contracts)

> **Nature**: this feature adds **no persistence**. It is a **presentation layer** over entities that
> already exist in the codebase. The only new model is a small derived **view state** (the active tab)
> that lives entirely in the client. No table, migration, `DataStore` method or shared type is added.

## 1. Reused entities (no changes)

| Entity | Existing source | Fields used by this page |
|--------|-----------------|--------------------------|
| `StudioProfile` | `src/lib/types/content.ts` (`STUDIO_PROFILE`) | `brand`, `tagline`, `bio`, `location` |
| `PiercingService` | `src/lib/data/services.ts` | `id`, `name`, `category`, `priceCents`, `durationMinutes`, `description`, `requiresDeposit`, `active` |
| `PiercingServiceCategory` | `src/lib/data/services.ts` (labels via `PIERCING_SERVICE_CATEGORIES`) | `id`, `label`, `description` |
| `TeamMember` | `src/lib/types/domain.ts` | `name`, `role`, `avatarUrl`, `bio`, `instagramHandle`, `isActive` |
| `ProcessStep` | `src/lib/types/content.ts` (`PROCESS_STEPS`) | `order`, `title`, `description` |
| `GalleryItem` | `src/lib/types/content.ts` (`GALLERY_ITEMS`) | `image`, `alt`, `label?` |
| Brand/contact | `src/lib/config.ts` | `BRAND_LOGO`, `WHATSAPP_PHONE` |

## 2. New derived view state

### LAND-01 · `TabId`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `"services" \| "team" \| "process"` | The three content areas. Default = `"services"`. |
| `label` | `string` | Spanish label: "Servicios", "Equipo", "Proceso & Galería". |

- Purely client state inside `LandingV2Tabs.svelte`; optionally mirrored to `?tab=` in the URL
  (read on mount, `history.replaceState` on change). Not persisted.

### LAND-02 · `ServiceGroup` (derived, in-memory)

| Field | Type | Notes |
|-------|------|-------|
| `category` | `PiercingServiceCategoryInfo` | Category id/label/description. |
| `services` | `PiercingService[]` | Active services in that category, in catalog order. |

- Built by mapping `PIERCING_SERVICE_CATEGORIES` and filtering the loaded (active) services — the same
  grouping the current landing uses. Groups with zero services are omitted.

## 3. Relationships

- `ServiceGroup` ← `PiercingService[]` filtered by `category`; only `active` services are shown.
- Team panel ← `TeamSection.svelte` (which independently lists `isActive = true` members).
- Process/Gallery panel ← static `PROCESS_STEPS` / `GALLERY_ITEMS` (no filtering).
- The "Reservar" action is a navigation (`/booking?service=<id>`); it does not mutate any model here.

## 4. Validation rules

None new. The page is read-only: it trusts the `DataStore` contracts (services validated by the
adapters) and only formats/regroups for display. Deposit/price rendering is display-only and uses the
existing `formatCents` helper (integer cents, no money math).

## 5. No persistence / no state transitions

- No new table, migration or `DataStore` operation.
- No appointment status transitions (the page only links to the existing booking flow).
