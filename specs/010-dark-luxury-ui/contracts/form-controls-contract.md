# Contract: Shared Form Controls

**Feature**: 010-dark-luxury-ui

Governs the global `.input` / `.field` skin defined in `src/styles/tokens.css` and consumed by every form
across booking, admin and modals.

## 1. Token surface

New/updated tokens (raw values live only in `tokens.css`; mirrored in `design-system.md`):

| Token | Purpose | Request intent |
|-------|---------|----------------|
| `--bg-control` | Refined control surface | `bg-[#18181b]` / `bg-zinc-900/80` |
| `--border-control` | Defined control border | `border border-white/15` |
| `--control-padding` | Inner padding | `0.625rem 1rem` (`py-2.5 px-4`) |
| `--control-min-height` | Minimum control height | compact but **≥44px** (a11y minimum) |
| `--control-font-size` | Control text size | `0.95rem` |
| focus = `--accent-primary` border + `--accent-primary-glow` ring | Soft gold focus | `border-[#E5A93C] ring-1 ring-[#E5A93C]/30` |

## 2. Skin rules

Every `input`, `select` and `textarea` carrying `.input` MUST:

- Use `--bg-control` surface, `--border-control` border and `--radius-image` radius.
- Use `--control-padding` and `--control-min-height`, with `--control-font-size` text size.
- Keep `color-scheme: dark` so native date pickers and select menus follow the dark surface.
- Render placeholders in `--text-muted`.

Label groups (`.field`) keep their flex-column layout, `--text-secondary` label color and weight 600.

## 3. States

| State | Treatment |
|-------|-----------|
| Rest | `--bg-control` surface + `--border-control` border. |
| Hover | No behavioral change required (optional subtle border emphasis is allowed). |
| **Focus-visible** | Border `--accent-primary` **and** soft outer ring (`--accent-primary-glow`); replaces the hard outline. |
| Disabled | `--text-muted` text, `not-allowed` cursor (existing). |

- Focus MUST remain clearly visible for keyboard users (contrast of the gold ring against the surface).
- The compact height MUST NOT drop below the 44px tactile minimum.

## 4. Invariants

- Data entry, validation and submission behavior is **unchanged** across all forms.
- Controls that are siblings of (not nested in) their label must render identically to nested ones.
- No per-component override may reintroduce the browser-native control skin.
- Raw color/radius/shadow values appear only in `tokens.css`.
