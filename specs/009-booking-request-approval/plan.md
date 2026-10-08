# Implementation Plan: Booking Request Persistence & Admin Approval

**Branch**: `009-booking-request-approval` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-booking-request-approval/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Make the public booking flow **persist-first**: submitting the form records the appointment as
`PENDING`, immediately holds the date/time, clears the form and shows an accessible success panel with
the reassurance copy plus a secondary "Enviar comprobante / aviso por WhatsApp" action (no auto-open).
On `/admin`, appointments render a color-coded status badge (PENDING amber/orange, CONFIRMED green-gold,
CANCELLED red/muted); PENDING exposes **Aprobar**/**Cancelar**; approving sets `CONFIRMED` and yields a
one-tap WhatsApp confirmation link. A DB migration swaps the current all-status unique constraint for a
partial unique index so cancelling a request releases its slot. Status transitions move into a new
domain service (`src/lib/services/booking.ts`) to satisfy the constitution's integrity rule.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js` (production adapter),
`lucide-svelte` (icons), `open-props` (via `tokens.css`).

**Storage**: Supabase Postgres `public.bookings` (production) / browser `localStorage` (demo). Columns
already exist (`status text check (PENDING|CONFIRMED|CANCELLED)`, `booking_date`, `time_slot`, integer
`price_cents`/`deposit_cents`). One **schema change**: replace `unique (booking_date, time_slot)` with a
partial unique index excluding `CANCELLED` (migration `0006`).

**Testing**: `astro check` (type gate, zero errors — required by the user prompt), `npm run build`,
`npm run lint`, and the manual scenarios in `quickstart.md`. No unit-test runner is currently installed.

**Target Platform**: Static web (Astro `output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + Svelte islands), no separate backend.

**Performance Goals**: Perceived submit confirmation in ~2s or less; 60fps interactions; no layout
thrash; availability grid responds without a full page reload.

**Constraints**: No Tailwind; all styling via `tokens.css`; components MUST NOT call `fetch`/Supabase
directly and MUST delegate data access to the domain layer; status transitions only through domain
service functions; integer cents only; public insert allowed by RLS, status updates require the
authenticated admin session.

**Scale/Scope**: Single-studio operations — a handful of bookings per day, one public booking page, one
admin calendar. Scope is limited to the booking submit/success flow and the admin status/badges/actions;
the deposit ledger is explicitly out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `constitution.md` v1.1.0 (supreme) and `.specify/memory/constitution.md`.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS | No new islands. `BookingFlow` stays `client:load`; admin calendar already ships in the `/admin` island. No full-page client app. |
| II. Token-Driven Styling (Zero Tailwind) | PASS (with action) | Success panel and status badges consume tokens only; any new status color (e.g. green-gold for `CONFIRMED`) is added to `tokens.css` **first** and reflected in `design-system.md`. |
| III. Type-Safe by Default | PASS | Reuses the existing `Booking`/`BookingStatus`/`NewBookingInput`/`DataStore` types; no `any`; new service interfaces are explicitly typed; `astro check` must pass with zero errors. |
| IV. Booking & Financial Integrity | CONDITIONAL | Integer cents preserved; slot exclusivity hardened via a partial unique index; **status transitions moved into a domain service** (`src/lib/services/booking.ts`) to replace the current ad-hoc `dataStore.updateBookingStatus` calls in components. Two justified deviations recorded in Complexity Tracking (PENDING slot hold; manual approval as validation). |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | Success panel uses `role="status"`/dialog semantics, focus management, visible states and ≥44px targets; honors `prefers-reduced-motion`; no horizontal scroll 320–1920px. |
| Data Access (Workflow) | PASS (with action) | Components delegate to the new domain service; no direct Supabase calls in `.svelte`. |
| Schema Control (Workflow) | PASS | The unique-index change ships as `supabase/migrations/0006_*.sql`; the `bookings` column set is unchanged, so `src/types/supabase.ts` stays consistent. |

**Gate result**: PASS with justified deviations documented below (no unresolved violations).

### Post-Design Re-evaluation (after Phase 1)

Re-checked against the generated `research.md`, `data-model.md`, `contracts/` and `quickstart.md`:

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| II. Token-Driven Styling | PASS | Badge tokens reuse/​extend `tokens.css`; contract §1 forbids raw hex in components. |
| III. Type-Safe | PASS | No new/parallel types; migration changes constraints only, so `src/types/supabase.ts` stays valid. |
| IV. Booking & Financial Integrity | PASS (justified) | Partial unique index enforces active-slot exclusivity; transitions centralized in `src/lib/services/booking.ts`; integer cents preserved. Deviations remain the two recorded in Complexity Tracking (PENDING hold; manual approval as validation). |
| Data Access / Schema Control | PASS | Components call the service only; the constraint change ships as migration `0006`. |

No new violations were introduced by the design; the Complexity Tracking justifications still hold.

## Project Structure

### Documentation (this feature)

```text
specs/009-booking-request-approval/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── booking-flow-contract.md
│   ├── admin-approval-contract.md
│   └── data-layer-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── booking/
│   │   └── BookingFlow.svelte          # MODIFY: persist-first submit, busy state, success panel,
│   │                                    #         immediate slot hold, clear form, notice link
│   └── admin/
│       └── AdminCalendar.svelte        # MODIFY: status badges (amber/green-gold/red), Aprobar/Cancelar,
│                                        #         WhatsApp confirmation link after approval
├── lib/
│   ├── services/
│   │   └── booking.ts                  # NEW: domain service — submitBookingRequest / approveBooking /
│   │                                    #      cancelBooking (transitions + message links)
│   ├── data/
│   │   ├── adapters/supabase.ts        # MODIFY: map unique-violation (23505) to a friendly DataError
│   │   └── adapters/local.ts           # MODIFY (parity): reject duplicate active slot
│   ├── types/domain.ts                 # REUSE: Booking / BookingStatus / NewBookingInput / DataStore
│   └── utils/booking.ts                # MODIFY: WhatsApp builders — booking notice + confirmation
├── styles/tokens.css                   # MODIFY (only if a new status color token is needed)
└── types/supabase.ts                   # UNCHANGED (column set is stable)

supabase/
└── migrations/
    └── 0006_release_cancelled_slots.sql  # NEW: partial unique index excluding CANCELLED
```

**Structure Decision**: Single-project Astro/Svelte layout. The only new source module is the domain
service `src/lib/services/booking.ts`; everything else is a modification of existing components/utilities
plus one SQL migration.

## Complexity Tracking

> Deviations from the constitution that are justified here.

| Violation / Tension | Why Needed | Simpler Alternative Rejected Because |
|---------------------|------------|--------------------------------------|
| A `PENDING` request **holds** its date/time in public availability, while constitution §IV states "pending deposits never block a slot". | The client must be protected from a slot being double-claimed while the studio reviews, and the DB already enforces an exclusive `(booking_date, time_slot)`. The repo constitution §IV also states "no two non-cancelled appointments may share the same slot", which supports the hold. | Treating `PENDING` as non-blocking would let two clients request the same slot and force manual reconciliation, directly contradicting the explicit feature requirement ("bloquea inmediatamente ese slot"). |
| Manual **Aprobar** flips a booking to `CONFIRMED` without a validated deposit ledger, while constitution §IV ties `CONFIRMED` to deposit-receipt validation. | No deposit ledger (`deposit_payments`) is implemented in this codebase; the studio's manual approval is the validation event in the current model (feature 006 already does this). | Building the full deposit ledger is out of scope and would block the requested flow. The deviation is contained to the approval action and can be revisited when the ledger lands. |
| A new `src/lib/services/` domain layer is introduced. | Constitution §IV requires status transitions to occur through domain service functions, and §2.3 requires components to delegate data access. | Keeping `dataStore.updateBookingStatus(...)` inline in the admin component would perpetuate the existing governance violation and scatter transition rules. |
