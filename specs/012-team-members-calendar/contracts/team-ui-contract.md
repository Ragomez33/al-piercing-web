# Contract: Team UI (Landing Section + Admin Equipo Tab)

**Feature**: 012-team-members-calendar · **Phase**: 1 (Design & Contracts)

## 1. Public landing section — "Nuestro Equipo / Artistas"

- Component: `src/components/team/TeamSection.svelte`, mounted in `src/pages/index.astro` with
  **`client:visible`** (below-the-fold content; justified against Principle 1).
- The component renders the **entire `<section>`** (so it can hide itself).
- Data: `dataStore.listTeamMembers()` on mount (active only). While loading → a small skeleton grid.
  On read failure → `listFallbackTeamMembers()` (demo seed) plus a non-blocking `role="status"` notice.
- **Empty state**: when there are no active members, the section renders nothing (no heading) so the
  landing is unaffected (FR-004).
- Card contents: avatar (or `/images/placeholder.svg` fallback via `data-fallback`), `name`, `role`,
  `bio`, and an Instagram link **only when** `instagramHandle` is non-empty
  (`https://instagram.com/<handle>`, `target="_blank" rel="noopener noreferrer"`, labeled).
- Layout: responsive card grid (1 column at 320px → 2–3 columns at ≥768px); text wraps
  (`overflow-wrap: anywhere`); no horizontal page scroll.
- Styling: tokens only (card/`--bg-card-light`, `--border-card`, `--radius-card`, `--shadow-card`,
  gold accents). Reduced motion honored (no animation needed).

## 2. Admin "Equipo" tab

- `AdminPanel.svelte` gains a fourth `AdminTab` value `"team"` and a sidebar link
  (`Users` icon) between Servicios and the account controls; `?tab=team` deep-links it (same mechanism as
  `calendar`/`catalog`/`services`).
- **List** (mirrors Inventario/Servicios rows):
  - avatar thumbnail, `name`, `role`, active toggle (`role="switch"`, `aria-checked`), and an
    "Inactivo" chip when `isActive = false`.
  - `[Editar]` and `[Eliminar]` actions per row.
  - Loading hint (`aria-live`), error alert (`role="alert"`), and an empty state.
- **Create / Edit modal** (`role="dialog"`, `aria-modal="true"`, labeled):
  - Fields: **Nombre** (required), **Rol** (required), **Bio** (textarea), **Instagram** (optional),
    **Avatar** (file input `accept="image/*"` with a live preview; uploads via
    `uploadImage(file, { prefix: "team-" })` while saving; busy label "Subiendo imagen…").
  - Client-side validation (name/role non-empty); server/adapter errors shown in `role="alert"`; the modal
    stays open on error.
- **Delete confirmation** (`role="alertdialog"`): explains the member is removed from admin and the public
  section; confirms before `deleteTeamMember`.
- All controls ≥44px, visible focus, `Escape`/backdrop close, reduced motion honored.
- Refresh after every successful mutation (no optimistic list edits).

## 3. Copy & content

- Public copy is Spanish ("Nuestro Equipo", "Artistas", role labels as entered by the studio).
- Admin copy in Spanish: "Equipo", "Nuevo miembro", "Nombre", "Rol", "Bio", "Instagram", "Avatar",
  "Guardar", "Eliminar", "Inactivo".
- Data access only through `dataStore`/`storage` services; no direct Supabase calls in the component.
