# Implementation Plan: Complete SEO Optimization for ALPIERCING

**Branch**: `014-seo-optimization` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-seo-optimization/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add complete, automated SEO to the static site with **no visible content change** and **no client
JavaScript**:

1. **Reusable metadata component** `src/components/SEO.astro`: renders `title`, `description`,
   `robots` (`index, follow`, or `noindex` for the admin), an absolute **canonical**, **OpenGraph**
   (`og:title/description/image/type/url/site_name`) and **Twitter Cards**
   (`twitter:card/title/description/image`), with studio-wide defaults from `STUDIO_PROFILE` /
   `src/lib/config.ts`.
2. **Base layout integration** (`src/layouts/BaseLayout.astro`): mounts `SEO.astro` in `<head>`, builds
   the canonical from `import.meta.env.SITE`, and emits a single **JSON-LD `LocalBusiness`**
   (`BeautySalon`/`TattooShop`) with name, logo, image, telephone, address, `priceRange: "$$"`, booking
   `potentialAction`, and coordinates only when configured.
3. **Crawl artifacts**: migrate page titles/descriptions to per-page props; generate `robots.txt` at the
   site root (public allowed, `/admin` disallowed, absolute `Sitemap:` line) and configure the
   `@astrojs/sitemap` integration so `sitemap-index.xml` is produced on every build, excluding `/admin`.

The base URL comes from the `site` configuration, fed by the `SITE` environment variable; components read
`import.meta.env.SITE`.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**New dependency**: `@astrojs/sitemap` (build-time integration only; no runtime cost).

**Storage**: N/A — SEO output is generated at build time from the static studio profile/config.

**Testing**: `npx astro check` (type gate, **zero errors**), `npm run build`, `npm run lint`, plus the
manual scenarios in `quickstart.md` and a structured-data validator. No unit-test runner is installed.

**Target Platform**: Static web (`output: static`); output consumed by search crawlers, social scrapers
and browsers.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: zero added client JavaScript and no added requests — all tags are server-rendered
into the static HTML; the sitemap is generated once per build.

**Constraints**: No Tailwind; token-driven styling (`design-system.md` binding) — this feature adds no
styling. Do not alter visible content or existing behavior/routes. Admin MUST NOT be indexed. Canonical
URLs MUST be absolute. The type-check gate MUST pass with zero errors.

**Scale/Scope**: ~6 public pages (landing `/`, `/landing-v2`, `/catalog`, `/booking`, plus generated
sitemap/robots) and one non-indexable page (`/admin`). One new static Astro component, one small
`src/lib/seo.ts` helper, one layout edit, one config edit, one new route endpoint.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `.specify/memory/constitution.md` (v1.0.0); `design-system.md` is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Static-First & Islands of Interactivity | PASS | No new island. `SEO.astro` and the JSON-LD block are pure server-rendered markup; no `client:*` directive is added. |
| 2. Token-Driven Styling (Zero Tailwind) | PASS | No UI/styling change at all. |
| 3. Type-Safe by Default | PASS | `SEO.astro` props and the JSON-LD builder are typed; no `any`; `astro check` zero errors. |
| 4. Booking & Financial Integrity | PASS | No money logic; the structured data only *links* to the existing booking page. |
| 5. Mobile-First, Accessible & Zero Overhead UX | PASS | Zero client JS and no layout change; improves discoverability without affecting UX. |
| Data Access (Workflow) | PASS | No data-layer access; profile/config are static build-time constants. |
| Schema Control (Workflow) | PASS | No database schema change (JSON-LD is document metadata, not app schema). |
| Design Parity (Workflow) | PASS | No visual change; `design-system.md`/`README.md` updated to document the SEO layer. |

**Gate result**: PASS with no unjustified violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| 1 / 5 | PASS | The contract confirms only server-rendered head tags + a build-time endpoint; no island and no client JS. |
| 2 / 3 | PASS | No styling; typed props and a typed JSON-LD builder; `astro check` is the gate. |
| 4 / Data Access / Schema Control | PASS | Structured data references the existing booking route; no schema/data changes. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/014-seo-optimization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── seo-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── SEO.astro                    # NEW: reusable <head> metadata component
├── lib/
│   ├── seo.ts                       # NEW: site URL, defaults, LocalBusiness JSON-LD builder
│   └── config.ts                    # MODIFY: add default OG image + business SEO constants
├── layouts/
│   └── BaseLayout.astro             # MODIFY: mount <SEO/>, emit JSON-LD, accept page SEO props
├── pages/
│   ├── index.astro                  # MODIFY: pass per-page description
│   ├── landing-v2.astro             # MODIFY: pass per-page description
│   ├── catalog.astro                # MODIFY: pass per-page description
│   ├── booking.astro                # MODIFY: pass per-page description
│   ├── admin.astro                  # MODIFY: pass noindex
│   └── robots.txt.ts                # NEW: build-time robots.txt (env-based absolute Sitemap URL)
public/
└── (no robots.txt — generated by the endpoint above)
astro.config.mjs                     # MODIFY: site from SITE env + @astrojs/sitemap (filter /admin)
package.json                         # MODIFY: add @astrojs/sitemap
README.md / design-system.md         # MODIFY: document the SEO layer
```

**Structure Decision**: Single-project Astro layout. Metadata is centralized in one static component
(`SEO.astro`) consumed by the single `BaseLayout`, so every page inherits correct tags automatically and
per-page overrides are opt-in props. The JSON-LD builder lives in `src/lib/seo.ts` to keep the layout
declarative, and robots.txt is generated by a static endpoint so its absolute `Sitemap:` URL always
matches the configured site.

## Complexity Tracking

> Deviations from the constitution that are justified here.

**None** — no constitution violations. One deliberate, documented trade-off:

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| `robots.txt` is generated by `src/pages/robots.txt.ts` instead of a hand-written `public/robots.txt`. | The `Sitemap:` directive must be an **absolute** URL; a static file cannot interpolate the `SITE` env var, so it would hardcode a placeholder domain that breaks when the domain changes. | A static `public/robots.txt`: simpler, but requires a hardcoded domain and drifts from the sitemap when `SITE` changes. |
