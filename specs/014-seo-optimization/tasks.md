---

description: "Task list for Complete SEO Optimization for ALPIERCING"
---

# Tasks: Complete SEO Optimization for ALPIERCING

**Input**: Design documents from `/specs/014-seo-optimization/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/seo-contract.md, quickstart.md

**Tests**: Not requested. The spec defines no test tasks and the project has no unit-test runner, so this
list contains **no automated test tasks**. Validation is via `npx astro check` / `npm run build` /
`npm run lint` and the manual `quickstart.md` scenarios (final phase).

**Organization**: Tasks are grouped by user story (US1–US3) to enable independent implementation and
testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Every task includes the exact file path(s) it changes

## Path Conventions

Single Astro/Svelte project: `src/`, `public/`, `specs/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the build-time dependency and environment documentation.

- [x] T001 Install the sitemap integration (`npm install @astrojs/sitemap`) and add the `SITE` variable to `.env.example` (e.g. `SITE=https://alpiercing.com`, commented as the public base URL). Confirm `npx astro check` still reports **0 errors** (baseline).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared SEO resolution helpers and site configuration that all stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Create `src/lib/seo.ts` and extend `src/lib/config.ts`:
  - In `src/lib/config.ts` add SEO constants: `DEFAULT_OG_IMAGE` (fallback `BRAND_LOGO`), `INSTAGRAM_URL`, structured business address (`BUSINESS_ADDRESS`: `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry` with defaults), optional `BUSINESS_GEO` (`{ latitude, longitude } | null`, default `null`), `BUSINESS_OPENING_HOURS` and `BUSINESS_PRICE_RANGE` (`"$$"`).
  - In `src/lib/seo.ts` export `SITE_URL` (from `import.meta.env.SITE`, with a safe fallback), `absoluteUrl(path: string): string`, `resolveTitle/resolveDescription/resolveImage` defaults from `STUDIO_PROFILE`, and a typed `buildLocalBusinessJsonLd()` returning the `LocalBusiness`/`BeautySalon`/`TattooShop` object (contract §3) — **omit `geo` when `BUSINESS_GEO` is null**, never emit empty required values.
- [x] T003 [P] Configure the site base URL in `astro.config.mjs`: `site: process.env.SITE || "https://alpiercing.com"` so Astro populates `import.meta.env.SITE` for canonical/OG/JSON-LD/robots.

**Checkpoint**: `import.meta.env.SITE` and the SEO helpers resolve; foundation ready.

---

## Phase 3: User Story 1 - Correct, shareable metadata on every public page (Priority: P1) 🎯 MVP

**Goal**: Every public page emits unique title/description, `index, follow`, absolute canonical,
OpenGraph and Twitter Card tags, with studio-wide defaults.

**Independent Test**: Open any public page and confirm `title`, `description`, `robots`, absolute
canonical, all `og:*` and all `twitter:*` tags render; check a page that omits props to confirm the
defaults kick in.

- [x] T004 [US1] Create `src/components/SEO.astro`: typed props `{ title?, description?, image?, canonicalURL?, type?, noindex? }`; render `<title>`, `meta[name=description]`, `meta[name=robots]` (`index, follow` | `noindex, nofollow`), `<link rel="canonical">`, OpenGraph (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`, `og:site_name`) and Twitter Cards (`twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`). Resolve defaults via `src/lib/seo.ts` / `STUDIO_PROFILE`; make `canonical`, `og:image` and `twitter:image` **absolute**. (contract §1, FR-001–006)
- [x] T005 [US1] Integrate `SEO.astro` into `src/layouts/BaseLayout.astro`: extend `Props` to `{ title?, description?, image?, type?, noindex? }`, mount `<SEO ... />` in `<head>`, and **remove** the now-duplicated `<title>` and `<meta name="description">` (keep charset, viewport, icons, theme-color, generator). (contract §2)
- [x] T006 [P] [US1] Add a concise Spanish `description` (and keep the existing `title`) prop to `src/pages/index.astro`.
- [x] T007 [P] [US1] Add a concise Spanish `description`/`title` prop to `src/pages/landing-v2.astro`.
- [x] T008 [P] [US1] Add a concise Spanish `description`/`title` prop to `src/pages/catalog.astro`.
- [x] T009 [P] [US1] Add a concise Spanish `description`/`title` prop to `src/pages/booking.astro`.

**Checkpoint**: US1 works independently — every public page has complete metadata and valid social cards.

---

## Phase 4: User Story 2 - Recognized as a valid local business (Priority: P2)

**Goal**: A single valid `LocalBusiness` JSON-LD block with name, logo, image, phone, address, `$$` and a
booking action.

**Independent Test**: View a public page's source, confirm one `application/ld+json` block parses and
validates as `LocalBusiness` with the required fields and a booking `potentialAction`; confirm `geo` is
present only when configured.

- [x] T010 [US2] Emit the structured data in `src/layouts/BaseLayout.astro`: add exactly one `<script type="application/ld+json" set:html={JSON.stringify(buildLocalBusinessJsonLd())} />` using the builder from `src/lib/seo.ts` (import it). (contract §3, FR-007/FR-010)

**Checkpoint**: US1 + US2 both work; structured data validates.

---

## Phase 5: User Story 3 - Full discoverability, admin excluded (Priority: P2)

**Goal**: Generate `robots.txt` (public allowed, `/admin` disallowed, absolute sitemap reference) and an
auto-generated sitemap that excludes `/admin`.

**Independent Test**: After `npm run build`, confirm `dist/robots.txt` has the allow/disallow rules and
an absolute `Sitemap:` line, and `dist/sitemap-index.xml` lists the public pages with no `/admin`; confirm
`/admin` renders `noindex, nofollow`.

- [x] T011 [US3] Create `src/pages/robots.txt.ts` (static endpoint returning `text/plain`): `User-agent: *`, `Allow: /`, `Disallow: /admin`, blank line, `Sitemap: ${absoluteUrl("/sitemap-index.xml")}`. (contract §4, FR-008)
- [x] T012 [US3] Add the `@astrojs/sitemap` integration to `astro.config.mjs` with a `filter` that excludes any URL containing `/admin`; confirm it emits `sitemap-index.xml` on build. (contract §5, FR-009)
- [x] T013 [US3] Pass `noindex` to the layout in `src/pages/admin.astro` (`<BaseLayout title="Panel — ALPIERCING" noindex>`). (FR-008/SC-004)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, artifact verification and the type/build/lint gates.

- [x] T014 [P] Update `README.md`: document the SEO layer (metadata component, `LocalBusiness` JSON-LD, generated `robots.txt`, `sitemap-index.xml`) and the `SITE` environment variable.
- [x] T015 [P] Update `design-system.md`: note that `<head>` metadata is owned by `SEO.astro`/`BaseLayout` (no visual change) and that structured data is emitted by the layout.
- [x] T016 Run the quality gates: `npx astro check` (**0 errors** — explicit user requirement), `npm run build`, `npm run lint`. Confirm the build emits `dist/robots.txt` + `dist/sitemap-index.xml` and that the pages contain the expected tags. (depends on all implementation tasks)
- [x] T017 Execute the `specs/014-seo-optimization/quickstart.md` scenarios S1–S9 (including a structured-data validation pass and the `SITE` domain-change check). (depends on T016)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — blocks all user stories (helpers + `site`).
- **User Stories (Phase 3+)**: Depend on Foundational. US2 resumes `BaseLayout.astro` after US1; US3 depends on `site` (T003) and, for `noindex`, on `SEO.astro`/`BaseLayout` (T004/T005).
- **Polish (Phase 6)**: Depends on all user stories.

### User Story Dependencies

- **US1 (P1)**: after Foundational — standalone MVP.
- **US2 (P2)**: after US1 (same `BaseLayout.astro` file).
- **US3 (P2)**: after Foundational for robots/sitemap; the admin `noindex` (T013) needs US1's `noindex` prop.

### Within Each User Story

- `SEO.astro` (T004) before `BaseLayout` integration (T005) before per-page props (T006–T009).
- `BaseLayout.astro` is touched by T005 (US1) then T010 (US2) → sequential.
- `astro.config.mjs` is touched by T003 (Foundational) then T012 (US3) → sequential.
- Story complete and validated before moving to the next priority.

### Parallel Opportunities

- Foundational: T002 and T003 are distinct files → parallel.
- US1: T006, T007, T008, T009 are four different page files → parallel (after T005).
- Polish: T014 and T015 are distinct docs → parallel; T016 then T017.

---

## Parallel Example: User Story 1 per-page metadata

```bash
# After T004/T005, add per-page descriptions in parallel (distinct files):
Task: "T006 add description to src/pages/index.astro"
Task: "T007 add description to src/pages/landing-v2.astro"
Task: "T008 add description to src/pages/catalog.astro"
Task: "T009 add description to src/pages/booking.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (helpers + `site`).
3. Complete Phase 3: US1 (metadata component + layout + per-page props).
4. **STOP and VALIDATE**: open each page and confirm metadata + social tags; run `npx astro check`.
5. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → base URL + helpers ready.
2. US1 → per-page metadata + social cards (MVP).
3. US2 → `LocalBusiness` structured data.
4. US3 → `robots.txt` + sitemap + admin exclusion.
5. Polish → docs + gates + quickstart.

### Notes

- [P] = different files, no dependency on an incomplete task.
- [Story] label maps each task to its user story for traceability.
- No automated tests are generated (not requested; no test runner installed). The manual quickstart is
  the validation gate.
- `npx astro check` must report **0 errors** before completion; `npm run build` and `npm run lint` must pass.
- No new island, no client JavaScript and no visual/content changes; the admin area is the only path
  excluded from indexing and the sitemap.
