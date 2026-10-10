# Quickstart Validation: Complete SEO Optimization for ALPIERCING

End-to-end validation for the SEO layer (metadata, structured data, crawl artifacts). Details live in
[contracts/seo-contract.md](./contracts/seo-contract.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node `>=22.12.0`, npm. Install deps: `npm install` (adds `@astrojs/sitemap`).
- Set the public address for correct absolute URLs, e.g. in `.env.local`:
  `SITE=https://alpiercing.com` (defaults to `https://alpiercing.com` when unset).

## Setup / commands

```bash
npm run dev        # http://localhost:4321
npx astro check    # type gate — MUST be 0 errors (explicit user requirement)
npm run build      # MUST succeed and emit robots.txt + sitemap-index.xml
npm run lint       # eslint MUST be clean
```

## Scenarios

### S1 — Standard meta tags per page (US1)
1. Open `/`, `/landing-v2`, `/catalog`, `/booking` and view the page source (or DevTools → Elements).
2. **Expected**: each page has a unique non-empty `<title>` and `<meta name="description">`, an
   `index, follow` robots meta and an absolute `<link rel="canonical">` pointing to that page.
   (contract §1, FR-001–003)

### S2 — OpenGraph & Twitter Cards (US1)
1. In the source, inspect the `og:*` and `twitter:*` tags.
2. **Expected**: `og:title`, `og:description`, `og:image` (absolute), `og:type`, `og:url` (absolute),
   `og:site_name`, plus `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`,
   `twitter:image`. Paste a page URL into a social preview tool and confirm a complete card.
   (contract §1, FR-004–005, SC-002)

### S3 — Defaults when props are omitted (US1 / edge)
1. Inspect a page that doesn't override the description/image.
2. **Expected**: the studio profile description and the default studio image/logo are used; no empty
   tags. (contract §1, FR-006)

### S4 — Structured data (US2)
1. View the source of any public page and locate the single `application/ld+json` block.
2. **Expected**: valid JSON of `@type` `["LocalBusiness","BeautySalon","TattooShop"]` with name, url,
   logo, image, description, telephone, `priceRange: "$$"`, address, `sameAs`, `openingHours` and a
   `potentialAction`/booking link; `geo` present **only** if coordinates are configured.
   Validate it in a structured-data validator with no errors. (contract §3, FR-007, SC-003)

### S5 — Robots policy (US3)
1. Run `npm run build`, then inspect `dist/robots.txt` (or `/robots.txt` in preview).
2. **Expected**: `User-agent: *`, `Allow: /`, `Disallow: /admin` and an absolute
   `Sitemap: <site>/sitemap-index.xml`. (contract §4, FR-008)

### S6 — Sitemap (US3)
1. After build, inspect `dist/sitemap-index.xml` (and `dist/sitemap-0.xml`).
2. **Expected**: absolute URLs for `/`, `/landing-v2`, `/catalog` and `/booking`; **no `/admin`** entry.
   (contract §5, FR-009, SC-004)

### S7 — Admin excluded (US3 / edge)
1. Open `/admin` and view its source.
2. **Expected**: `noindex, nofollow` robots meta; the page is absent from the sitemap and blocked in
   `robots.txt`. (FR-008, SC-004)

### S8 — No regressions (all)
1. Browse `/`, `/landing-v2`, `/catalog` (+ cart), `/booking` (submit) and `/admin`; confirm the visible
   content and behavior are unchanged and no extra client JS/requests were added.
2. Run `npx astro check`, `npm run build`, `npm run lint`.
3. **Expected**: unchanged UX; **0 errors**; build emits all SEO artifacts; clean lint. (SC-005)

### S9 — Domain change (edge)
1. Build with `SITE=https://example.test` and inspect the canonical, `og:url`, JSON-LD `url` and
   `robots.txt` `Sitemap:` line.
2. **Expected**: all absolute URLs reflect the configured site (no hardcoded domain).
   (FR-003/FR-008/FR-009)

## Exit criteria

- All scenarios pass.
- `npx astro check` → **0 errors**; `npm run build` and `npm run lint` succeed.
- Every public page has complete metadata + one valid `LocalBusiness` JSON-LD; `/admin` is excluded from
  indexing and the sitemap; `robots.txt` and `sitemap-index.xml` are emitted on every build.
- No visible content changes and no added client JavaScript.
