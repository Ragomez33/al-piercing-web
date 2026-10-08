---

description: "Task list for Booking Flow & WhatsApp Deposit feature implementation"
---

# Tasks: Booking Flow & WhatsApp Deposit

**Input**: Design documents from `/specs/003-booking-whatsapp/` (incl. clarifications 2026-10-07:
menu deep-links, deterministic agenda, deposit via WhatsApp only)

**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: The feature specification does NOT request test tasks (no TDD). Validation is done
through `quickstart.md` scenarios S1–S7 plus `astro check` / `npm run build` gates.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Astro project)
- Data → `src/lib/data/services.ts`; utils → `src/lib/utils/`; island →
  `src/components/booking/BookingFlow.svelte`; pages → `src/pages/`; tokens → `src/styles/tokens.css`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the baseline and directories the feature needs

- [x] T001 Verify baseline: run `npx astro check` and `npm run build` at repository root; both MUST exit 0
- [x] T002 [P] Ensure directories exist: `src/lib/data/`, `src/lib/utils/`, `src/components/booking/`
- [x] T003 [P] Verify `@astrojs/svelte` integration is active and `lucide-svelte` is a dependency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Typed service data, money/booking utils and tokens that MUST exist before any story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create src/lib/data/services.ts — `PiercingService` interface (`id`, `name`, `category` enum `"Nariz" | "Oreja" | "Boca" | "Corporal"`, `priceCents`, `durationMinutes`, `description`, `requiresDeposit`) + `PIERCING_SERVICES: PiercingService[]` (Nostril 2500, Septum 3000, Bridge 3500, Helix 2500, Conch 3000, Lóbulo 2000, Labret 2800, Navel 3200 — integer cents) + `PIERCING_SERVICE_CATEGORIES`
- [x] T005 [P] Create src/lib/utils/money.ts — `formatCents(cents)` via `Intl.NumberFormat` (USD, 2 decimals) and `calcDepositCents(totalCents)` = `Math.round(totalCents / 2)` (integer cents)
- [x] T006 [P] Create src/lib/utils/booking.ts — `BookingRequest` type + `buildBookingWhatsAppLink(request)` returning `https://wa.me/{phone}?text={encodeURIComponent(message)}` with service, category, duration, date, time, price, deposit, balance and client data; `null` when phone is not digits-only or a required field is empty
- [x] T007 [P] Add the missing tokens to src/styles/tokens.css before any component references them: `--accent-on: #111113`, `--bg-pill-hover: #2A2A31`, `--overlay-backdrop`, `--ink-blob-core/accent/transparent` (the Dark Premium theme remaps the base palette to charcoal/gold — see design-system v4.0.0)
- [x] T008 [P] Make src/components/canvas/InkBackgroundCanvas.svelte read its sprite colors from the CSS tokens via `getComputedStyle` (no raw brand values in components)

**Checkpoint**: Foundation ready — typed services, money/booking utils, tokens complete

---

## Phase 3: User Story 1 - Browse the service menu (Priority: P1) 🎯 MVP

**Goal**: The landing page renders the fixed service menu grouped by category; each service links
to `/booking?service={id}`.

**Independent Test**: Open `/` — grouped service list renders with price/duration; a row links to
the booking page (quickstart S1).

### Implementation for User Story 1

- [x] T009 [US1] Rebrand src/lib/types/content.ts for the piercing domain — `STUDIO_PROFILE` (ALPIERCING), `GALLERY_ITEMS`, `PROCESS_STEPS` (Consulta y Diseño / Reserva con Seña 50% / Perforación y Cuidados), `Route` without `/gallery`
- [x] T010 [US1] Rework src/pages/index.astro — Hero + static Setmore-style menu grouped by category (rows linking to `/booking?service={id}`) + gallery section + process block; token-only styling
- [x] T011 [US1] Update src/components/ui/AppHeader.astro — brand from `STUDIO_PROFILE`, nav items Inicio/Catálogo/Reservar, token hover (`--bg-pill-hover`)

**Checkpoint**: User Story 1 functional — static menu links into the booking flow

---

## Phase 4: User Story 2 - Pick a date and time (Priority: P2)

**Goal**: After selecting a service, the visitor chooses a valid date and an available time slot.

**Independent Test**: Select a service, choose a date, confirm the slot grid appears with
unavailable slots disabled (quickstart S3).

### Implementation for User Story 2

- [x] T012 [US2] Create src/components/booking/BookingFlow.svelte — the SINGLE `client:load` island: service menu with `aria-pressed`, date input (`min={today}`, local timezone), 30-minute agenda 11:00–19:30, deterministic slot availability, and a `fieldset` grouping disabled until a date is chosen; changing the date resets the time
- [x] T013 [US2] Wire the deep link in BookingFlow.svelte in src/components/booking/BookingFlow.svelte — `onMount` reads `?service={id}` and pre-selects the matching service, revealing the form
- [x] T014 [US2] Rework src/pages/booking.astro — use `BaseLayout`, render the section heading and mount `<BookingFlow client:load />` as the sole island

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Client data, deposit & WhatsApp (Priority: P3)

**Goal**: The visitor enters data, sees the 50% deposit/balance, and confirms via a pre-filled
WhatsApp message.

**Independent Test**: With a valid request, confirm the WhatsApp link contains every field; with
missing data the confirm action stays disabled (quickstart S4/S5/S6).

### Implementation for User Story 3

- [x] T015 [US3] Add the client form to BookingFlow.svelte in src/components/booking/BookingFlow.svelte — name + WhatsApp required, notes optional, labeled inputs, `autocomplete`/`inputmode` hints
- [x] T016 [US3] Add the deposit summary to BookingFlow.svelte in src/components/booking/BookingFlow.svelte — price, `Seña (50%)` and `Saldo en el local` with `tabular-nums`, derived via `calcDepositCents`
- [x] T017 [US3] Add the confirmation action to BookingFlow.svelte in src/components/booking/BookingFlow.svelte — button "Confirmar turno por WhatsApp", disabled until valid, builds the link with `buildBookingWhatsAppLink({ phone: WHATSAPP_PHONE, ... })` and opens it in a new tab

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting the whole feature and final validation

- [x] T018 [P] Accessibility pass: labeled controls, `aria-pressed` on services/slots, disabled states, ≥ 44px targets, visible focus (quickstart S7)
- [x] T019 [P] Responsive pass: no horizontal scroll 320px–1920px; slot grid `auto-fill`; grids adapt
- [x] T020 [P] Token pass: no raw hex/rgba outside `src/styles/tokens.css` (grep-verified)
- [x] T021 Run final validation against quickstart.md S1–S7 plus `npx astro check` and `npm run build` — all MUST pass with zero errors
- [x] T022 [P] Remove obsolete routing/assets: delete `src/pages/gallery.astro` (folded into index) and the unused `studio-tee` asset

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: Depend on Foundational; sequential in priority order
- **Polish (Phase 6)**: Depends on all stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — static menu only
- **US2 (P2)**: After US1 — creates the island consumed by US3
- **US3 (P3)**: After US2 — same island file, sequential
- **CROSS-CUTTING**: `BookingFlow.svelte` is built by T012 (US2) → T015/T016/T017 (US3) — strictly sequential

---

## Notes

- [P] tasks = different files, no dependencies
- Data-model constraints (integer cents; deposit = round(price/2); no past dates; confirmation
  disabled until valid) are quoted verbatim and MUST NOT change at implementation time
- WhatsApp message template (contract §3) and button label "Confirmar turno por WhatsApp" are binding
- `BookingFlow.svelte` is the ONLY hydrated island in this feature
- Availability is a deterministic placeholder until PocketBase provides real slots
