# Phase 0 Research: Complete SEO Optimization for ALPIERCING

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-10 · **Phase**: 0 (Outline & Research)

All `Technical Context` unknowns are resolved below. No `NEEDS CLARIFICATION` remainders.

## R1. Metadata component contract (`SEO.astro`)

- **Decision**: A single Astro component `src/components/SEO.astro` with typed props
  `{ title?, description?, image?, canonicalURL?, type?, noindex? }` renders: `<title>`, `meta[name=description]`,
  `meta[name=robots]` (`index, follow` | `noindex, nofollow`), `<link rel="canonical">`, all OpenGraph
  tags and all Twitter Card tags. It resolves defaults internally so pages/callers can omit everything.
- **Rationale**: FR-001…FR-006. Astro components are server-rendered (Principle I) and `Astro.props`
  gives type-safe inputs (Principle III).
- **Alternatives considered**: A Svelte island (forces client JS for static head content — rejected);
  duplicating tags in each page (drift + duplication).

## R2. Absolute canonical & URLs

- **Decision**: Resolve the base from `import.meta.env.SITE` (populated by Astro from the `site`
  config). Canonical = `new URL(Astro.url.pathname, site).href`; OpenGraph `og:url` = same. If `SITE` is
  absent, fall back to `Astro.url.origin`.
- **Rationale**: FR-003 requires absolute canonical URLs and the request explicitly names
  `import.meta.env.SITE`. `new URL` guarantees a single absolute form (prevents duplicate-content).
- **Alternatives considered**: Relative canonicals (invalid); hardcoded domain string in components
  (drifts per environment).

## R3. `site` configuration

- **Decision**: `astro.config.mjs` sets `site: process.env.SITE || "https://alpiercing.com"` (Astro
  populates `import.meta.env.SITE` from this) and adds the `@astrojs/sitemap` integration. Document the
  `SITE` variable in `.env.example`.
- **Rationale**: `@astrojs/sitemap` requires a `site`; the default keeps local/CI builds working while
  the host sets `SITE` to the real domain. The config runs in Node, so `process.env` is the reliable
  source.
- **Alternatives considered**: No default (sitemap silently disabled — fails FR-009).

## R4. JSON-LD `LocalBusiness`

- **Decision**: `src/lib/seo.ts` exports `buildLocalBusinessJsonLd()` returning a typed object of
  `@type` `["LocalBusiness","BeautySalon","TattooShop"]` with `@context`, `name`, `url`, `logo`,
  `image`, `description`, `telephone` (`WHATSAPP_PHONE`), `priceRange: "$$"`, `address`
  (`PostalAddress` from the studio location), `sameAs` (Instagram), `openingHours`, and a
  `potentialAction` (`ReserveAction` → `/booking`). `geo` (`GeoCoordinates`) is included **only** when
  coordinates are configured; it is omitted otherwise. `BaseLayout` emits it via
  `<script type="application/ld+json" set:html={JSON.stringify(obj)} />`.
- **Rationale**: FR-007/FR-010 and SC-003. Building the object in TS keeps it type-safe and testable;
  `JSON.stringify` produces valid JSON; omitting `geo` avoids empty required values.
- **Alternatives considered**: Static JSON literal in the layout (not typed, easy to drift);
  third-party schema library (unnecessary dependency).

## R5. robots.txt generation

- **Decision**: Generate `robots.txt` from a static endpoint `src/pages/robots.txt.ts` returning
  `User-agent: * / Allow: / / Disallow: /admin` plus `Sitemap: <site>/sitemap-index.xml`, where `<site>`
  comes from `import.meta.env.SITE`.
- **Rationale**: FR-008 requires crawl rules **and** a sitemap reference; the `Sitemap:` line must be
  absolute, which a static `public/robots.txt` cannot build from the env var. A static endpoint with
  `output: static` is prerendered to `dist/robots.txt` at the site root.
- **Alternatives considered**: `public/robots.txt` (hardcoded domain — drifts when `SITE` changes);
  omitting the sitemap line (fails FR-008).

## R6. Sitemap integration

- **Decision**: Add `@astrojs/sitemap` to `astro.config.mjs` with a `filter` that excludes `/admin`
  (and any future non-public path). The integration emits `sitemap-index.xml` (and `sitemap-0.xml`) on
  every build from the prerendered public pages.
- **Rationale**: FR-009/SC-004. The integration is build-time only (no runtime cost) and requires the
  `site` configured in R3.
- **Alternatives considered**: Hand-maintained sitemap (drifts, no auto-discovery); `@astrojs/sitemap`
  without a filter (would include `/admin` — fails SC-004).

## R7. Per-page titles/descriptions & admin noindex

- **Decision**: Extend `BaseLayout` props to `{ title?, description?, image?, type?, noindex? }` and
  forward them to `SEO.astro`. Each public page passes a concise Spanish `description`; the admin page
  passes `noindex`. Defaults come from `STUDIO_PROFILE`.
- **Rationale**: FR-001 requires unique per-page metadata (SC-001) while keeping defaults for safety
  (FR-006). Admin must never be indexed (FR-008/SC-004).
- **Alternatives considered**: Keeping the single shared description (not unique per page).

## R8. Default preview image

- **Decision**: Default `image` to the already-shipped studio asset in `src/lib/config.ts`
  (fallback `BRAND_LOGO`) and resolve it to an absolute URL for OG/Twitter. Pages may override.
- **Rationale**: FR-006/SC-002 — a card must always render; no new asset is required.
- **Alternatives considered**: A dedicated `og-image.jpg` (would require a new asset; deferred).

## R9. Content safety & cleanup

- **Decision**: Remove or replace the now-duplicated static `<meta name="description">` and `<title>`
  in `BaseLayout` so `SEO.astro` is the single source (no double tags). Keep `<meta charset>`,
  viewport, icons and `generator`. Titles/descriptions stay within sensible lengths for search results.
- **Rationale**: Avoid duplicate/conflicting tags that confuse crawlers (FR-001).
- **Alternatives considered**: Leaving both (duplicate title/description tags).

## R10. Verification gates

- **Decision**: The change MUST pass `npx astro check` (zero errors — explicit user requirement),
  `npm run build` (which must emit `robots.txt`, `sitemap-index.xml` and the tags), `npm run lint`, and
  the `quickstart.md` scenarios (including a structured-data validation pass).
- **Rationale**: SC-005 and the constitution's type-safety gate.
- **Alternatives considered**: None — hard gate.
