# Phase 1 Data Model: Complete SEO Optimization for ALPIERCING

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-10 · **Phase**: 1 (Design & Contracts)

> **Nature**: no persistence and no database schema. These are **build-time document models** emitted
> into the static HTML and crawl artifacts. Values derive from existing constants (`STUDIO_PROFILE`,
> `src/lib/config.ts`) and the `site` configuration.

## 1. PageMeta (input to `SEO.astro` / `BaseLayout` props)

| Field | Type | Required | Default | Rules |
|-------|------|----------|---------|-------|
| `title` | `string` | no | `"<brand> — <tagline>"` from `STUDIO_PROFILE` | non-empty after resolution |
| `description` | `string` | no | `STUDIO_PROFILE.bio` | non-empty; one concise sentence |
| `image` | `string` | no | default studio image (`BRAND_LOGO`) | resolved to an **absolute** URL for OG/Twitter |
| `canonicalURL` | `string` | no | absolute URL of the current page (`site` + `Astro.url.pathname`) | MUST be absolute |
| `type` | `string` | no | `"website"` | OpenGraph type (e.g. `website`) |
| `noindex` | `boolean` | no | `false` | when `true`, robots = `noindex, nofollow` |

**Derived output**: `<title>`, `meta[name=description]`, `meta[name=robots]`, `link[rel=canonical]`,
`og:title|description|image|type|url|site_name`, `twitter:card|title|description|image`.

## 2. BusinessProfile (NAP — build-time)

| Field | Source | Used by |
|-------|--------|---------|
| `name` | `STUDIO_PROFILE.brand` | JSON-LD `name`, `og:site_name` |
| `description` | `STUDIO_PROFILE.bio` | default description, JSON-LD `description` |
| `telephone` | `WHATSAPP_PHONE` (`src/lib/config.ts`) | JSON-LD `telephone` |
| `address` | `STUDIO_PROFILE.location` | JSON-LD `address` (PostalAddress) |
| `logo` | `BRAND_LOGO` (`src/lib/config.ts`) | JSON-LD `logo`, default image |
| `sameAs` | Instagram URL (`src/lib/config.ts`) | JSON-LD `sameAs` |
| `url` | `site` + `/` | JSON-LD `url` |
| `bookingUrl` | `site` + `/booking` | JSON-LD `potentialAction.target` |
| `priceRange` | constant `"$$"` | JSON-LD `priceRange` |
| `geo` | optional config (lat/long) | JSON-LD `geo` only when set |
| `openingHours` | constant/derived | JSON-LD `openingHours` |

## 3. LocalBusinessJsonLd (output document)

| Field | Type | Notes |
|-------|------|-------|
| `@context` | `"https://schema.org"` | required |
| `@type` | `["LocalBusiness","BeautySalon","TattooShop"]` | local business with specializations |
| `name` | `string` | studio brand |
| `url` | `string` (absolute) | site root |
| `logo` | `string` (absolute) | brand logo |
| `image` | `string` (absolute) | default/featured image |
| `description` | `string` | profile bio |
| `telephone` | `string` | configured phone/WhatsApp |
| `priceRange` | `"$$"` | FR-007 |
| `address` | `PostalAddress` | from studio location |
| `sameAs` | `string[]` | Instagram (and any other social) |
| `openingHours` | `string` | e.g. `Mo-Sa 11:00-20:00` |
| `potentialAction` | `ReserveAction` | target = booking URL |
| `geo` | `GeoCoordinates?` | **omitted** when coordinates are absent |

**Validation**: must be valid JSON (via `JSON.stringify`); required fields MUST be non-empty; `geo` is
omitted rather than empty.

## 4. RobotsPolicy (output `robots.txt`)

| Directive | Value |
|-----------|-------|
| `User-agent` | `*` |
| `Allow` | `/` |
| `Disallow` | `/admin` |
| `Sitemap` | `<site>/sitemap-index.xml` (absolute) |

## 5. SitemapEntry (derived by the integration)

| Field | Notes |
|-------|-------|
| `loc` | absolute URL of each prerendered **public** page |
| scope | excludes `/admin` (and any future private path) via `filter` |

## 6. Relationships

- `PageMeta` ← each page's props; fallbacks ← `BusinessProfile`.
- `BusinessProfile` → feeds `LocalBusinessJsonLd`, default `PageMeta`, and `og:site_name`.
- `RobotsPolicy` references the generated sitemap; `SitemapEntry[]` is produced from the public routes.

No state transitions and no persistence: everything is fixed at build time.
