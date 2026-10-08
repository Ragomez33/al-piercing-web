<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: N/A — initial ratification
- Added sections: Core Principles (I–V); Stack & Technology Constraints;
  Development Workflow & Quality Gates; Governance
- Removed sections: none
- Follow-up TODOs: none
-->

# Tattoo Art Constitution

## Core Principles

### I. Static-First & Islands of Interactivity
The site MUST render as static/SSR HTML by default, and client-side JavaScript MUST be
confined to Svelte islands. Every `client:*` directive MUST be justified: `client:load`
for above-the-fold interactive UI (cart, first booking step), `client:visible` for
below-the-fold interactive UI (background canvas, gallery filters, slot picker), and
`client:idle` for non-critical enhancements. Full-page client applications and duplicated
framework runtimes are forbidden. Three.js/Canvas MUST remain inside leaf islands.
Rationale: the public experience (landing, gallery, catalog, booking) MUST stay fast on
mid-to-low-range mobile devices.

### II. Token-Driven Styling (Zero Tailwind)
The single source of truth for visual style is `src/styles/tokens.css` (semantic CSS custom
properties layered over Open Props). Tailwind and any atomic utility framework are
forbidden. Colors, radii, shadows, spacing and typography MUST reference tokens; raw hex
literals are permitted only inside `tokens.css`. Component styling MUST use scoped `<style>`
blocks. Every visual decision MUST comply with `design-system.md`.
Rationale: a single token layer keeps the brand consistent and lets theme changes ship
without touching component code.

### III. Type-Safe by Default
TypeScript `strict` is mandatory and `astro check` MUST pass with zero errors. `any` is
forbidden; use `unknown` with explicit narrowing. Every domain entity (`Appointment`,
`Product`, `GalleryItem`, `Service`, `Deposit`) MUST have an explicit shared type under
`src/lib/types/`. External data (PocketBase responses, user input, WhatsApp payloads) MUST be
validated before it enters the app.

### IV. Booking & Financial Integrity
Monetary values (service quotes, deposits/señas, product prices) MUST be stored and compared
as integer cents. A date+time slot MUST be exclusive: no two non-cancelled appointments may
share the same slot. An appointment MUST become `CONFIRMED` only after the artist validates a
deposit receipt; pending deposits MUST NOT block a slot. Deposited money MUST be counted only
from validated, non-voided deposits. Appointment status transitions MUST occur exclusively
through domain service functions, never ad-hoc in components.

### V. Mobile-First, Accessible & Zero Overhead UX
Interactions MUST target 60fps and MUST NOT cause layout thrash. Interfaces MUST use semantic
HTML, labeled controls and visible focus states, MUST provide touch targets of at least 44px,
and MUST honor `prefers-reduced-motion`. Primary actions (add to cart, book a slot) MUST be
reachable within 2–3 taps from a module root.

## Stack & Technology Constraints
- Framework: Astro (output static/hybrid) with the `@astrojs/svelte` integration.
- Interactivity: Svelte 5 islands (runes: `$state`, `$derived`, `$props`, `$effect`).
- Styling: scoped CSS + Open Props + `tokens.css`; Tailwind is forbidden.
- 3D/Canvas: `three` with `@types/three`.
- Icons: `lucide-svelte` (deprecated upstream; migration to `@lucide/svelte` is tracked, and
  adding other icon libraries is forbidden).
- Data/Backend: `pocketbase`. Native `fetch` is permitted only for read-only/public endpoints
  that require no persistence.
- State: Svelte stores for ephemeral UI state (cart, booking wizard); PocketBase is the ground
  truth for domain data.
- Package manager: `npm`.

## Development Workflow & Quality Gates
- Spec First: no production feature code MAY be written without an approved spec under
  `.specify/specs/`.
- Schema Control: domain collection changes MUST be expressed as PocketBase migrations under
  `pb_migrations/` and reflected in `src/lib/types/` before any UI integration.
- Design Parity: new UI MUST use design tokens; new tokens/colors MUST be added to
  `tokens.css` first.
- Island Justification: every `client:*` directive MUST be justified against Principle I
  during review.
- Data Access: components MUST delegate data access to `src/lib/services/`; direct `fetch` or
  PocketBase calls inside `.svelte`/`.astro` files are forbidden.

## Governance
This constitution supersedes all other practices for architecture and data. `design-system.md`
is the binding authority for UI/visual decisions and is subordinate only to this document.
Amendments MUST be proposed as a documented change, reviewed for impact, and merged with a
migration note; the Sync Impact Report MUST accompany the amendment while it is under review.
Versioning follows semantic versioning: MAJOR for backward-incompatible governance or
principle removals/redefinitions, MINOR for new principles or materially expanded guidance,
PATCH for clarifications and non-semantic refinements. All reviews and pull requests MUST
verify compliance with these principles, and any added complexity MUST be justified. Runtime
development guidance lives in `design-system.md` and the per-feature specs under
`.specify/specs/`.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
