# Phase 1 Data Model: Landing V2 UX Overhaul, Copy Alignment & Admin Loading States

**Feature**: `015-landing-v2-ux-overhaul` | **Date**: 2026-10-10

This feature is primarily presentation + copy. It introduces **no database tables or migrations**. The
entities below are the static content types the UI reads, the reused domain entities, and the two new
**ephemeral (never persisted)** runtime types used by live sync and admin loading states.

---

## 1. StudioProfile (modified — static)

| Field | Type | Rules |
|-------|------|-------|
| `brand` | `string` | Non-empty. Unchanged (`"ALPIERCING"`). |
| `tagline` | `string` | Non-empty. Unchanged. |
| `bio` | `string` | Non-empty. Unchanged. |
| `location` | `string` | Non-empty; **must read `"El Tigre, Anzoátegui"`** (FR-013). |

Source: `src/lib/types/content.ts` (`STUDIO_PROFILE`). Reused by both landings, header, footer and SEO.

## 2. StructuredBusinessHours (new — static config)

| Field | Type | Rules |
|-------|------|-------|
| `schedule` | `Record<Weekday, { open: string; close: string } \| null>` | `Weekday` = `mon…sun`; times `HH:mm`; `null` = closed that day. |
| `displayLabel` | `string` | Human label, e.g. `"Lun–Sáb · 11:00–20:00"`. |

Derived from the configured schedule (`BUSINESS_OPENING_HOURS = "Mo-Sa 11:00-20:00"`) and exposed in
`src/lib/config.ts` as `BUSINESS_HOURS`. Consumed by `hours.ts` to compute the live open/closed status
and next change (FR-005). Environment-overridable, like the rest of `config.ts`.

## 3. StudioRating (new — static content)

| Field | Type | Rules |
|-------|------|-------|
| `value` | `number` | `0 ≤ value ≤ 5` (one decimal allowed). |
| `count` | `number` | Integer `≥ 0` (number of reviews). |

Source: `src/lib/types/content.ts` (`STUDIO_RATING`). Rendered in the sidebar card and the `#resenas`
block (FR-005).

## 4. Review (new — static content)

| Field | Type | Rules |
|-------|------|-------|
| `id` | `string` | Unique within the static list. |
| `author` | `string` | Non-empty. |
| `text` | `string` | Non-empty. |
| `rating` | `number` (optional) | `0 ≤ rating ≤ 5`. |

Source: `src/lib/types/content.ts` (`STUDIO_REVIEWS: Review[]`, 2–4 curated entries). Curated content
only — no authoring workflow (research R4). Empty list ⇒ the reviews block shows a graceful fallback
that does not break the card.

## 5. BookingPolicy (new — static copy)

| Field | Type | Rules |
|-------|------|-------|
| `title` | `string` | Non-empty, e.g. `"Política de reservas"`. |
| `body` | `string` | Non-empty notice text (open hours / advance payment / arrival). |

Source: `src/lib/types/content.ts` (`BOOKING_POLICY`). Rendered as the left-column advisory banner
(FR-004.1). Any deposit mention uses "Adelanto"/"Apartado" (FR-012).

## 6. Reused domain entities (unchanged)

- **Service** (`PiercingService`, `src/lib/data/services.ts`): `id, name, category, priceCents,
  durationMinutes, description, requiresDeposit, active`. Read-only here; grouped by category; only
  `active` shown publicly.
- **TeamMember** (`src/lib/types/domain.ts`): `id, name, role, avatarUrl, bio, instagramHandle,
  isActive, createdAt`. Only active members shown publicly.
- **GalleryItem** (`image, alt, label?`) and **ProcessStep** (`order, title, description`): static
  content reused for the Gallery section and the deposit/booking guidance.
- **ProductRecord**: reused by the admin catalog; only stock/publish display changes (no delete).

Money stays integer cents; the 50% deposit (`calcDepositCents`) is unchanged (Principle IV).

## 7. DataChangeEvent (new — ephemeral, never persisted)

| Field | Type | Rules |
|-------|------|-------|
| `resource` | `"services" \| "team" \| "products"` | Closed union; validation rejects others. |
| `origin` | `string` | Opaque emitter id (tab/session) so a subscriber can ignore self-originated events if desired. |
| `at` | `number` | Epoch ms, for debouncing/burst-coalescing. |

Produced by the wrapped `dataStore` on successful mutations and delivered by
`subscribeToDataChanges` (see `contracts/data-sync-contract.md`). Carries **no row payload** — the
subscriber re-fetches the affected resource (avoids leaking data across transports and keeps one code
path for demo/production).

## 8. AdminListRowState (new — ephemeral UI state)

| Value | Meaning | Transition |
|-------|---------|------------|
| `idle` | Row at rest. | default |
| `busy` | A mutation for this row is pending. Controls disabled; inline busy affordance shown. | `idle → busy` when a mutation starts |
| `error` | Mutation failed; **previous row data retained**. Inline message shown. | `busy → error` on reject; cleared on next attempt |

Lists also carry a per-list `{ items, hasLoaded, loading, error }` shape where `loading` only drives a
placeholder when `hasLoaded === false` (first load). After the first successful load, mutations patch
`items` in place and never reset `hasLoaded`, preventing the flicker (FR-016–FR-019). See
`contracts/admin-list-state-contract.md`.

## 9. Relationships

```text
StudioProfile ──(location/hours)──▶ LandingV2Sidebar
StudioRating ──┐
Review[]     ──┴──▶ LandingV2Sidebar (#resenas) + reviews block
BookingPolicy ─────▶ landing-v2.astro (left banner)
Service[] ──(live, via subscribeToDataChanges)──▶ LandingV2Services
TeamMember[] ──(live, via subscribeToDataChanges)──▶ TeamSection (V2 + V1)
ProductRecord[] / Service[] / TeamMember[] ──(mutation results)──▶ AdminPanel list state
```
