# UI Contract: Landing Page & Base Layout

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)

This document is the UI contract for the web application shell and landing page. It defines the
public routes the feature relies on and the content shapes the UI consumes (backed by
[`data-model.md`](../data-model.md)).

## 1. Route Contract

| Route | Module | Status in this feature | Role |
| --- | --- | --- | --- |
| `/` | landing | implemented | Hero, service menu, gallery, process block |
| `/catalog` | catalog | implemented | Secondary CTA target ("Ver Catálogo de Joyería") |
| `/booking` | booking | implemented | Primary CTA target ("Reservar Turno — 50% Seña") |
| `/admin` | admin | private, out of scope | Not linked from the landing page |

Any CTA or nav link MUST dereference to one of these routes ([data model validation](./data-model.md)).
There is **no `/gallery` route**: the gallery is a section of `/`.

## 2. Content Contract

Shapes consumed by the UI (strict TypeScript; see constitution Principle III).

```ts
// src/lib/types/content.ts (single source of truth for landing content)
export type Route = "/" | "/catalog" | "/booking" | "/admin";

export interface NavigationItem {
  label: string;
  href: Route;
}

export interface StudioProfile {
  brand: string;
  bio: string;
  location: string;
}

export interface GalleryItem {
  image: string; // asset reference
  alt: string;   // descriptive, REQUIRED
  label?: string;
}

export interface ProcessStep {
  order: 1 | 2 | 3;
  title: string;
  description: string;
}

export const NAV_ITEMS: NavigationItem[];
export const STUDIO_PROFILE: StudioProfile;
export const GALLERY_ITEMS: GalleryItem[];   // exactly 4
export const PROCESS_STEPS: ProcessStep[];   // exactly 3, order 1..3
```

> The service menu consumes `PIERCING_SERVICES` from `src/lib/data/services.ts`
> ([booking contract](../003-booking-whatsapp/contracts/booking-contract.md)).

## 3. Shell & Rendering Contract

- **Layout**: `BaseLayout.astro` MUST render (in order) the top gold-sheen gradient layer
  (approximately the first third of the viewport height), the ink-background island (decorative,
  non-blocking), the shared header and the page content slot.
- **Header**: brand centered over the gradient; quick links Inicio (`/`), Catálogo (`/catalog`),
  Reservar (`/booking`).
- **Landing page** MUST contain exactly one `h1` (hero headline) and use semantic sections for
  hero, service menu, gallery and process block.
- **Canvas island**: decorative, MUST be `aria-hidden="true"` and non-interactive
  (`pointer-events: none`); MUST NOT cover content; MUST respect `prefers-reduced-motion`
  (no continuous animation) and MUST pause when the tab is hidden. Its colors MUST be read from
  the `--ink-blob-*` tokens.
- **CTAs**: primary CTA uses the brand accent with its glow; secondary CTA uses the badge pill
  surface; both `rounded-full`; each MUST be a real link.
- **Accessibility**: all links/actions labeled; visible focus states; touch targets ≥ 44px; color
  contrast on light surfaces from the token palette; placeholder tiles for missing gallery images.
