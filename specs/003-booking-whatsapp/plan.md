# Implementation Plan: Booking Flow & WhatsApp Deposit

**Branch**: `003-booking-whatsapp` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-booking-whatsapp/spec.md` (incl. clarifications
2026-10-07: menu deep-links, deterministic agenda, deposit via WhatsApp only).

## Summary

Add a fixed Setmore-style service menu to the landing page and a single-page booking flow on
`/booking`. The landing menu is **static SSR** and deep-links each service to
`/booking?service={id}`. The booking page hydrates exactly **one island** (`BookingFlow`,
`client:load`) that owns service selection, the date/time picker, the client form, the 50%
deposit calculation and the WhatsApp message. Prices are integer cents; all styling uses
`tokens.css`; no Tailwind.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict via `astro/tsconfigs/strict`), Astro 7.3, Svelte 5

**Primary Dependencies**: `@astrojs/svelte` (integration), `lucide-svelte` (Clock icon), `open-props` + `tokens.css` (styling)

**Storage**: None — static content and ephemeral component state. No PocketBase writes in this feature.

**Testing**: `astro check` + `npm run build` gates; manual browser scenarios in `quickstart.md`

**Target Platform**: Modern evergreen browsers; mobile-first on mid-to-low-range devices

**Project Type**: Web application (static pages + one interactive booking island)

**Performance Goals**: Static service menu (zero client JS); one hydrated island on `/booking`; synchronous deposit math

**Constraints**: Money as integer cents; token-only styling; typed fixed service data; agenda of fixed slots; targets ≥ 44px; `tabular-nums` figures; no horizontal scroll 320–1920px

**Scale/Scope**: Landing service menu, booking island, deposit + WhatsApp message, money/booking utils, fixed service data. Catalog/admin untouched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I — Static-First & Islands of Interactivity**: PASS. The landing menu renders as
  static HTML; ONE island (`BookingFlow`, `client:load`) owns the booking interaction —
  justified as the first/only booking step, above the fold after service selection.
- **Principle II — Token-Driven Styling**: PASS. All styles consume `tokens.css` variables;
  new tokens (`--accent-on`, `--bg-pill-hover`, `--overlay-backdrop`, `--ink-blob-*`) were added
  to `tokens.css` before use.
- **Principle III — Type-Safe by Default**: PASS. `PiercingService`, `BookingRequest` and the
  money/booking helpers are typed; no `any`.
- **Principle IV — Booking & Financial Integrity**: PASS (in scope). Integer cents end-to-end;
  deposit is exact 50% (`Math.round`); no double counting; the calendar cannot produce past dates.
- **Principle V — Mobile-First, Accessible**: PASS. Labeled inputs, `aria-pressed` on selectable
  rows/slots, disabled states, `fieldset` grouping, targets ≥ 44px.
- **SDD — Design Parity / Island Justification**: PASS.

No gate violations. **Complexity Tracking**: not applicable.

## Project Structure

### Documentation (this feature)

```text
specs/003-booking-whatsapp/
├── plan.md              # This file
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── components/
│   └── booking/
│       └── BookingFlow.svelte       # SINGLE island (client:load): menu, slots, form, deposit, WhatsApp
├── lib/
│   ├── config.ts                    # WHATSAPP_PHONE (digits-only placeholder)
│   ├── data/
│   │   └── services.ts              # PiercingService + PIERCING_SERVICES (fixed menu)
│   ├── types/
│   │   └── content.ts               # StudioProfile, GalleryItem, ProcessStep
│   └── utils/
│       ├── money.ts                 # formatCents, calcDepositCents (integer cents)
│       └── booking.ts               # buildBookingWhatsAppLink
└── pages/
    ├── index.astro                  # static hero + Setmore menu + gallery + process
    └── booking.astro                # static shell + <BookingFlow client:load />
```

**Structure Decision**: The service menu is data (`src/lib/data/services.ts`) rendered
statically by `index.astro`, which keeps the landing SEO-friendly and JS-free. All booking
interactivity is centralized in a single island; money and message logic live in framework-
agnostic utils so they can be unit-tested and reused by the future PocketBase service layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no constitution violations.

**Post-Design Re-check (after Phase 1)**: PASS — see `data-model.md` and
`contracts/booking-contract.md`; the single-island design, deterministic availability and
integer-cents deposit were verified against all five principles.
