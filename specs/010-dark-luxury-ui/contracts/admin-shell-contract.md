# Contract: Admin Shell (Sidebar / Drawer)

**Feature**: 010-dark-luxury-ui

Governs the authenticated dashboard chrome in `src/components/admin/AdminPanel.svelte` (the existing
`client:load` island). The gate branches (`checking`, `notice`, `login`) stay centered and simple; only the
`dashboard` branch adopts the shell. All calendar/inventory content and data actions are unchanged.

## 1. Structure

- The dashboard renders a two-region shell:
  - **Navigation region** (`<nav>` semantic): brand "ALPIERCING Admin" (logo + wordmark) at the top; a
    vertical list of section buttons with icons — **Calendario** (`calendar`) and **Inventario**
    (`catalog`); a bottom block with the data-mode badge, the signed-in email and a **Cerrar Sesión**
    button.
  - **Main content region**: occupies the remaining space (`flex: 1`) with generous, consistent padding,
    hosting the existing `<AdminCalendar />` or the inventory table/modal.
- No new island, component framework or data access is introduced.

## 2. Active state

- The active section MUST be visually distinguished **by color** (gold accent: `--accent-primary` fill /
  `--accent-on` content, or gold text + accent bar) and expose the pressed/selected semantics
  (`aria-current` or `aria-pressed`).
- Inactive items use `--text-secondary` with a refined hover state (gold-tinted text/surface).

## 3. Responsive behavior

| Viewport | Behavior |
|----------|----------|
| Wide (≥ medium breakpoint) | Persistent left sidebar, fixed width, `position: sticky; top: 0; height: 100vh`, right divider. Main content fills the rest. |
| Narrow (< medium breakpoint) | Sidebar becomes an **off-canvas drawer** toggled by an accessible button. A backdrop closes it. |

### Drawer accessibility

- Toggle button exposes `aria-expanded` and `aria-controls` and has an accessible label.
- Opening the drawer moves focus into it; closing returns focus to the toggle.
- The drawer closes on `Escape` and on backdrop activation.
- Open/close transitions are short and disabled under `prefers-reduced-motion: reduce`.
- At 320px the shell MUST NOT introduce horizontal page scroll.

## 4. Preserved behavior (invariants)

- The `Calendario`/`Inventario` switch keeps the existing `switchTab` logic and `?tab=` query sync.
- Calendar actions (approve/cancel/reschedule) and inventory actions (stock, publish, create) are
  unchanged, including all modals.
- Auth gate, `signIn`, session restore, `onAuthStateChange` and `signOut` are unchanged; **Cerrar Sesión**
  invokes the existing `logout()`.
- Every interactive control keeps a ≥44px target and a visible focus indicator.
- The public footer is not rendered on `/admin` (see public-shell-contract §3 and plan Complexity
  Tracking).

## 5. Stacking

- The sidebar/drawer uses the shared layer tokens (`--z-header`/`--z-overlay`); the drawer backdrop must sit
  above page content but **below** existing modals (which remain the top layer). Opening an admin modal
  (booking detail/block/create product) MUST leave it above the drawer/sidebar.
