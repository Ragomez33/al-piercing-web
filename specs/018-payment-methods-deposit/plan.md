# Implementation Plan: Payment Methods, Deposit Proofs & Appointment Review

**Branch**: `018-payment-methods-deposit` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-payment-methods-deposit/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add a complete **managed deposit-payment lifecycle** on top of the existing hybrid data layer
(`src/lib/data/store.ts` → `dataStore`) and the existing booking/approval flow (features 009/017),
following the exact patterns of the services (011), team (012) and gallery (016) modules:

1. **Data layer**: a new `PaymentMethod` entity (`id`, `type`, `title`, `details`, `instructions`,
   `isActive`, `createdAt`), extension of the existing `Booking` entity with payment fields
   (`paymentMethodId`, `paymentMethodName`, `paymentReference`, `paymentProofUrl`), four `DataStore`
   operations for methods (`listPaymentMethods`, `createPaymentMethod`, `updatePaymentMethod`,
   `togglePaymentMethodActive`, `deletePaymentMethod`), a `DataStore` operation to fetch a payment-method
   list scoped to the client, the migration `supabase/migrations/0009_payments_and_booking_proof.sql`
   (`public.payment_methods` + new `bookings` columns + status set + `booking_events` + RLS), the matching
   hand-maintained `payment_methods`/`booking_events` types in `src/types/supabase.ts`, a demo seed
   (`src/lib/data/payment-methods.ts` + local key `alpi:paymentmethods:v1`), and a
   `listFallbackPaymentMethods` fallback exported from `store.ts`.
2. **Client booking flow** (`BookingFlow.svelte`): when the chosen service `requiresDeposit`, insert a
   **payment step** before the final submit — load active methods, let the client pick one, reveal its
   banking details + instructions, and require a **reference number** plus an **uploaded receipt image**
   (via `uploadImage`/`uploadPaymentProofImage`). The appointment is persisted as `PENDING` with all
   payment fields attached.
3. **Admin payment-methods tab** (`AdminPanel.svelte` → `/admin?tab=payments`): a new **Métodos de Pago**
   sidebar entry and a dedicated child component (`AdminPayments.svelte`) to create, edit,
   activate/deactivate and delete methods, with a type-driven dynamic field set (mobile payment,
   crypto, Zelle, transfer, cash) and the feature-015/016 flicker-free list-state pattern.
4. **Admin appointment detail** (`AdminCalendar.svelte` → `AdminBookingDetail.svelte`): the existing
   modal gains client/service/deposit sections, a **payment-verification** section (method, reference,
   and a lightbox/enlarge view of the receipt) and direct actions **Aprobar / Rechazar / Notificar**.
5. **Notifications & traceability**: status transitions (`PENDING→CONFIRMED`, `PENDING→REJECTED`, …) are
   centralized in the booking domain service (`src/lib/services/booking.ts`) and each one is recorded in
   `booking_events`; the **Notificar por WhatsApp** action opens a pre-filled message with service, date,
   time and deposit confirmation.

No new dependencies, no new islands (all new UI lives inside existing islands), integer-cents money model
preserved end-to-end.

## Technical Context

**Language/Version**: TypeScript (strict, `astro/tsconfigs/strict`); Astro `^7.3.7`; Svelte `^5.57.2`
(runes: `$state`, `$derived`, `$effect`); Node `>=22.12.0`.

**Primary Dependencies**: `@astrojs/svelte`, `@supabase/supabase-js`, `lucide-svelte`, `open-props`.
**No new dependencies**.

**Storage**: Reuses the hybrid data layer (`src/lib/data/store.ts` → `dataStore`): Supabase Postgres
(production) / browser `localStorage` (demo). Adds **two new tables** (`payment_methods`,
`booking_events`), **new columns on `bookings`** and a redefinition of the active-slot partial unique
index, plus **two new demo storage keys** (`alpi:paymentmethods:v1`, `alpi:bookingevents:v1`).

**Testing**: `npx astro check` (type gate, **zero errors** — explicit user requirement), `npm run build`,
`npm run lint`, plus the manual scenarios in `quickstart.md`. The project has no unit-test runner.

**Target Platform**: Static web (`output: static`) rendered in mobile-first browsers, 320–1920px.

**Project Type**: Single web application (Astro pages + justified Svelte islands); no separate backend.

**Performance Goals**: 60fps; the client payment step must not block the booking grid (methods load
alongside service selection); the admin detail modal opens instantly from already-loaded rows; receipt
preview uses the already-fetched public URL (no extra round-trip beyond the upload); realtime refetches
only the affected resource and patches in place.

**Constraints**: No Tailwind; token-driven styling + scoped CSS (`design-system.md` binding). Data access
only via `dataStore`; image transport only via `src/lib/services/storage.ts`; status transitions only via
the booking domain service (`src/lib/services/booking.ts`); integer cents only (the DB `deposit_amount`
is a **generated** numeric convenience derived from `deposit_cents`, never a second source of truth);
public can read active methods and create appointments; method management and appointment status changes
require the authenticated admin session; migrations follow the numbered `0001–0008` style; the
hand-maintained `src/types/supabase.ts` must stay in sync; `astro check` zero errors.

**Scale/Scope**: Single-studio site; a handful of payment methods and a handful of appointments/day.
Scope = one migration, two new tables + booking columns, domain/type edits (domain + supabase.ts), two
adapter edits (local seed + supabase mapping), store/realtime extension, one domain-service extension,
one client payment step, one new admin tab + child component, one extracted admin detail component, docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Governed by `.specify/memory/constitution.md` (v1.0.0); `design-system.md` is the binding UI authority.

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Static-First & Islands of Interactivity | PASS | No new islands. `BookingFlow` stays `client:load`; `AdminPayments` / `AdminBookingDetail` are plain child components inside the existing `/admin` island. No full-page client app, no new runtimes. |
| II. Token-Driven Styling (Zero Tailwind) | PASS (with action) | New payment-step, tab, modal and badge UI consume existing tokens (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`, `--shadow-glow`, `--overlay-backdrop`, `--status-*`); a new `--status-rejected-*` (and any missing token) is added to `tokens.css` **first** and mirrored in `design-system.md`. No raw hex in components. |
| III. Type-Safe by Default | PASS | `PaymentMethod`, `PaymentMethodType`, `PaymentMethodDetails`, `NewPaymentMethodInput`, `BookingPaymentStatus`, `BookingEvent`, `NewBookingEventInput` are explicit shared types under `src/types/`; `src/types/supabase.ts` gains `payment_methods`/`booking_events` and the new `bookings` columns; no `any`; `astro check` is the gate. |
| IV. Booking & Financial Integrity | PASS (with action) | Integer cents preserved end-to-end (`depositCents` stays authoritative; DB `deposit_amount` is `generated always as (deposit_cents::numeric / 100) stored`). Active-slot exclusivity updates to exclude `REJECTED`/`CANCELLED`. **All** status transitions move through `src/lib/services/booking.ts`, which is also the single place that records `booking_events`. |
| V. Mobile-First, Accessible & Zero Overhead UX | PASS | Payment step, methods tab and detail modal target 320–1920px with no horizontal scroll, ≥44px controls; the receipt lightbox is keyboard-operable (`Esc`, focus restore) and respects `prefers-reduced-motion`; the methods list uses the flicker-free first-load/busy/error pattern. |
| Data Access (Workflow) | PASS | Islands/components call only `dataStore` and the booking domain service; uploads only via `storage.ts`; no direct Supabase access from `.svelte`/`.astro`. |
| Schema Control (Workflow) | PASS | New tables/columns expressed as migration `0009_payments_and_booking_proof.sql` and mirrored in `src/types/supabase.ts` before UI integration; demo parity via local-adapter seeds + `booking_events` logging. |
| Design Parity (Workflow) | PASS (with action) | `design-system.md` and `README.md` are updated to document the payment-methods tab, the client payment step and the detail modal. |

**Gate result**: PASS with justified follow-ups (new status token; generated `deposit_amount`) and no
unresolved violations.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Post-design note |
|-----------|--------|------------------|
| I. Islands | PASS | Contracts add no `client:*` directives; the methods tab and detail view are children of the existing admin island. |
| II / V | PASS | Contracts forbid raw values and require in-place updates, ≥44px targets, keyboard lightbox, lazy images and reduced-motion handling; the single new token is declared in `tokens.css`. |
| III / Schema | PASS | Contracts pin both entities, the `booking_events` shape, the migration and the `supabase.ts` keys; `astro check` is the gate. |
| IV | PASS | Contracts require transitions and event logging through `booking.ts` only; integer cents and slot exclusivity rules are pinned. |
| Data Access | PASS | Payment-method CRUD, proof upload and event reads all stay behind the facade/service. |

No new violations were introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/018-payment-methods-deposit/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── payment-data-contract.md
│   ├── client-booking-payment-contract.md
│   ├── admin-payments-ui-contract.md
│   └── admin-booking-detail-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
supabase/migrations/0009_payments_and_booking_proof.sql   # NEW: payment_methods + booking_events +
                                                          #      bookings payment columns + status +
                                                          #      partial unique index + RLS

src/
├── types/
│   ├── supabase.ts                            # MODIFY: payment_methods, booking_events, new bookings cols
│   └── lib/types/domain.ts                    # MODIFY: PaymentMethod(+Input/Type/Details), Booking
│                                              #         payment fields, BookingEvent, DataStore methods
├── lib/
│   ├── data/
│   │   ├── payment-methods.ts                 # NEW: PAYMENT_METHOD_SEED (demo seed)
│   │   ├── adapters/local.ts                  # MODIFY: alpi:paymentmethods:v1 / alpi:bookingevents:v1
│   │   │                                      #         CRUD + guard + event logging on status change
│   │   ├── adapters/supabase.ts               # MODIFY: payment_methods/booking_events mapping + columns
│   │   ├── realtime.ts                        # MODIFY: DataResource += "paymentMethods"
│   │   └── store.ts                           # MODIFY: publish + listFallbackPaymentMethods + wrapper
│   ├── services/
│   │   ├── booking.ts                         # MODIFY: rejectBooking/completeBooking + event logging +
│   │   │                                      #         payment passthrough + notify/reject links
│   │   └── storage.ts                         # MODIFY: uploadPaymentProofImage wrapper (prefix "proof-")
│   └── utils/
│       ├── booking.ts                         # MODIFY: confirmation/rejection WhatsApp builders (+deposit)
│       └── payments.ts                        # NEW: type labels + field descriptors + validation
├── components/
│   ├── booking/BookingFlow.svelte             # MODIFY: conditional deposit payment step
│   └── admin/
│       ├── AdminPanel.svelte                  # MODIFY: "Métodos de Pago" tab (?tab=payments)
│       ├── AdminPayments.svelte               # NEW: payment-methods CRUD UI (child, not an island)
│       ├── AdminCalendar.svelte               # MODIFY: open detail component, reject/notify actions
│       └── AdminBookingDetail.svelte          # NEW: detail modal body + receipt lightbox (child)
├── styles/tokens.css                          # MODIFY: --status-rejected-* (+ any missing badge token)
└── lib/config.ts                              # MODIFY: PAYMENT_* constants become demo seed/fallback

design-system.md                               # MODIFY: document payments tab, client step, detail modal
README.md                                      # MODIFY: route/tab/structure updates
```

**Structure Decision**: Single-project Astro/Svelte layout, consistent with 009/011/012/016. The new
entities reuse the `domain.ts` + dual-adapter + `withChangeNotifications` pattern; the admin tab reuses
the flicker-free list-state pattern; the client step is added inside the existing `BookingFlow` island;
the admin detail is extracted from `AdminCalendar` into a child component to keep the calendar focused and
to isolate the receipt lightbox and action logic. No new islands or directives.

## Complexity Tracking

> Deviations from the constitution that are justified here.

| Trade-off (not a violation) | Why needed | Rejected alternative |
|-----------------------------|------------|----------------------|
| DB `deposit_amount numeric` implemented as a **generated** column derived from `deposit_cents`. | The spec explicitly asks for a numeric `deposit_amount`, while constitution §IV mandates integer cents as the single money representation. A generated column satisfies the schema surface without creating a second editable source of truth. | A freely-writable `deposit_amount numeric` (rejected: two sources of truth, rounding drift); omitting `deposit_amount` (rejected: contradicts the requested schema). |
| New `REJECTED` status kept **alongside** the existing `CANCELLED`. | The requested vocabulary is pending/confirmed/rejected/completed; existing 009 flows and UI already use `CANCELLED`. Adding `REJECTED` (and `COMPLETED`) avoids a destructive rename while satisfying the request; both non-active states release the slot. | Renaming `CANCELLED` → `REJECTED` everywhere (rejected: breaks existing data/UI and 009 semantics); mapping "Rechazar" onto `CANCELLED` (rejected: the spec explicitly lists `rejected`). |
| Traceability recorded by the data layer on every status change (`booking_events`), not by a Postgres trigger only. | Demo mode (no backend) must have parity with production, and the constitution centralizes transitions in the domain service. Logging inside `createBooking`/`updateBookingStatus` covers both adapters with one rule. | A production-only DB trigger (rejected: no demo parity); ad-hoc logging in each component (rejected: scatters the transition rule and is error-prone). |
