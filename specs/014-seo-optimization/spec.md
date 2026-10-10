# Feature Specification: Complete SEO Optimization for ALPIERCING

**Feature Branch**: `014-seo-optimization`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Implementa la optimización SEO completa para ALPIERCING en Astro: 1. Componente de Meta Tags (src/components/SEO.astro) reutilizable con title, description, image, canonicalURL y type; meta tags estándar, OpenGraph y Twitter Cards con fallbacks desde STUDIO_PROFILE/src/lib/config.ts. 2. Integración en el Layout Base (BaseLayout.astro) en el <head> con URL canónica absoluta vía import.meta.env.SITE. 3. Datos Estructurados JSON-LD (LocalBusiness/BeautySalon/TattooShop) con nombre, logo, imagen, teléfono, dirección, coordenadas si aplica, rango de precios ($$) y enlace de reservas. 4. Archivos estáticos SEO: public/robots.txt permitiendo el rastreo público y bloqueando /admin; integración @astrojs/sitemap en astro.config.mjs para generar el sitemap-index.xml en cada build. Al finalizar, verificar con npx astro check y npm run build."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every public page shows correct, shareable metadata (Priority: P1)

A visitor (or a search engine or a social network) opens any public page of the studio and immediately
receives a complete, correct package of metadata: a unique page title, a concise description, a canonical
address, and rich preview cards when the page is shared on social networks or messaging apps. Every page
gets these automatically, with sensible studio-wide defaults, so pages never appear broken or generic in
results.

**Why this priority**: This is the foundation of the whole optimization — without per-page metadata the
rest (structured data, sitemaps) has no place to attach.

**Independent Test**: Open any public page, view the page source and confirm `title`, `description`,
`robots`, canonical (absolute URL), OpenGraph tags and Twitter Card tags render; share the page in a
preview tool and confirm a correct card appears.

**Acceptance Scenarios**:

1. **Given** any public page, **When** it renders, **Then** it outputs a unique, non-empty `title` and
   `description`, an `index, follow` robots directive, and an absolute canonical URL for that exact page.
2. **Given** the page metadata, **When** a social network fetches the page, **Then** OpenGraph
   (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`, `og:site_name`) and Twitter Card
   (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) tags are present.
3. **Given** a page without a custom description or image, **When** it renders, **Then** the studio-wide
   defaults (profile description, studio image/logo) are used instead of leaving them empty.

---

### User Story 2 - The studio is recognized as a valid local business (Priority: P2)

A person searching locally for a piercing studio sees a rich business result for ALPIERCING: correct
name, logo, photo, phone number, address, price level, and a direct path to book an appointment —
because the site exposes structured business data that search engines understand.

**Why this priority**: It amplifies the metadata (US1) into a validated business entity in local search,
but the site already works without it.

**Independent Test**: Open any public page, view the source and confirm a single JSON-LD block of type
`LocalBusiness` exists with the studio name, logo, image, telephone, address, `priceRange: "$$"` and a
booking-related link; validate the JSON parses and the type is recognized by a structured-data validator.

**Acceptance Scenarios**:

1. **Given** any public page, **When** it renders, **Then** exactly one structured-data block of type
   `LocalBusiness` (with `BeautySalon` / `TattooShop` specialization where appropriate) is present and
   syntactically valid.
2. **Given** the structured data, **When** search engines parse it, **Then** it includes the studio name,
   logo, image, telephone, postal address and price range (`$$`).
3. **Given** the structured data, **When** search engines parse it, **Then** it exposes an appointment
   action or booking link that points to the studio's booking page.

---

### User Story 3 - All public pages are discoverable; the admin area is not (Priority: P2)

Search engines can crawl and index every public page because the site publishes a machine-readable map
of its public URLs and explicit crawl rules, while the operator's private area is explicitly excluded
from indexing.

**Why this priority**: Completes the optimization by guaranteeing discovery of all public content and
protecting private pages from search results, but it is an additive layer over US1.

**Independent Test**: Open the generated sitemap index and confirm it lists the public pages with their
absolute URLs; open `robots.txt` and confirm public paths are allowed and `/admin` is disallowed; confirm
the admin page is not present in the sitemap.

**Acceptance Scenarios**:

1. **Given** the build completes, **When** the sitemap index is fetched, **Then** it lists the site's
   public pages with absolute URLs and updates automatically on every build.
2. **Given** `robots.txt`, **When** a crawler requests it, **Then** crawling is allowed for the public
   site and `/admin` is explicitly disallowed, and the sitemap location is declared.
3. **Given** the public pages, **When** the sitemap is generated, **Then** the admin area is absent from
   it.

---

### Edge Cases

- **Missing `title`/`description`** → studio-wide defaults from the profile are used; no empty tags.
- **Missing canonical** → defaults to the absolute URL of the rendered page; always absolute (never
  relative).
- **No site address configured at build time** → canonical and sitemap gracefully fall back without
  producing broken/relative URLs or failing the build.
- **Missing or broken image** → the default studio image/logo is used for OpenGraph/Twitter and the
  structured data, avoiding placeholder/blank cards.
- **Admin page** → never indexed: no indexability, excluded from the sitemap, and blocked in crawl rules.
- **Trailing slashes / duplicate URL forms** → canonical points to one canonical form, preventing
  duplicate-content signals.
- **Long titles/descriptions** → output remains valid (no unescaped or overflowing values); lengths are
  reasonable for search-result truncation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every public page MUST render a unique, non-empty `title` and `description` in its head.
- **FR-002**: Every public page MUST render a `robots` directive of `index, follow` (or equivalent) for
  crawling and indexing.
- **FR-003**: Every public page MUST render an absolute canonical URL pointing to itself.
- **FR-004**: Every public page MUST render the OpenGraph tags `og:title`, `og:description`, `og:image`,
  `og:type`, `og:url` and `og:site_name`.
- **FR-005**: Every public page MUST render the Twitter Card tags `twitter:card`, `twitter:title`,
  `twitter:description` and `twitter:image`.
- **FR-006**: When a page does not supply a title, description or image, the system MUST substitute the
  studio-wide defaults from the brand profile (title/description) and the configured default image/logo
  for preview images.
- **FR-007**: The site MUST expose a single structured-data block of type `LocalBusiness` (specialized as
  `BeautySalon`/`TattooShop` where appropriate) containing the studio name, logo, image, telephone,
  postal address, `priceRange: "$$"` and a booking action/link.
- **FR-008**: The site MUST publish crawl rules that allow indexing of the public site, explicitly
  disallow the admin area, and reference the sitemap.
- **FR-009**: The site MUST automatically generate a machine-readable sitemap index of its public pages
  on every build, excluding the admin area.
- **FR-010**: Structured data MUST be syntactically valid JSON and MUST NOT reference empty values for
  required fields.

### Key Entities *(include if feature involves data)*

- **Page metadata**: per-page `title`, `description`, preview `image`, canonical URL and sharing type —
  derived from each page or from the studio defaults.
- **Business profile (NAP)**: brand name, logo, description, address, telephone and default image —
  the single source for social previews and structured data. Built from the existing studio profile and
  site configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of public pages render the full metadata set (title, description, robots, canonical,
  OpenGraph and Twitter Card) with no missing or empty tags.
- **SC-002**: Sharing any public page in a common preview tool produces a complete card (title,
  description, image) without manual per-page setup.
- **SC-003**: The structured-data block validates as `LocalBusiness` with no errors in a standard
  structured-data validator and includes the studio name, logo, phone, address, `$$` price range and a
  booking link.
- **SC-004**: A search crawler can discover every public page through the generated sitemap, while the
  admin area is absent from the sitemap and explicitly disallowed in crawl rules.
- **SC-005**: The production build completes successfully and the type-check gate passes with zero
  errors, with all SEO artifacts (metadata, structured data, crawl rules, sitemap) present in the
  output.

## Assumptions

- **Address**: the canonical and sitemap use the site's configured public address (build-time
  environment/configuration); pages that lack one fall back gracefully.
- **Default image**: the studio logo/asset already shipped with the site is used as the fallback preview
  and structured-data image unless a page provides its own.
- **Coordinates**: geographic coordinates are provided only if available; otherwise the structured data
  omits them instead of referencing empty values.
- **Phone**: the configured studio WhatsApp/phone number in the site configuration is used as the
  `telephone` value.
- **Admin scope**: the admin area is excluded from search results (not indexed, not in the sitemap,
  blocked in crawl rules); no other path is excluded.
- **No new content**: this change adds no new visible page content; it only adds metadata, structured
  data and crawl artifacts, so existing pages and behavior remain unchanged.
- **Copy**: metadata titles/descriptions follow the existing Spanish copy conventions of the site.