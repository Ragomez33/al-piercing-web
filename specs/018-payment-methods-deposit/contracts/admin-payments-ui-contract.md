# Contract: Admin Payment Methods Tab

**Feature**: `018-payment-methods-deposit` | Covers `src/components/admin/AdminPanel.svelte`,
`src/components/admin/AdminPayments.svelte`, `src/lib/utils/payments.ts`, `src/styles/tokens.css`.

## 1. Tab shell (`AdminPanel.svelte`)

- `AdminTab` union gains `"payments"`.
- New sidebar entry **Métodos de Pago** (lucide `CreditCard`) placed after **Horarios**, with
  `class:active` + `aria-current` and `switchTab("payments")`.
- `switchTab` writes `?tab=payments` and calls `refreshPaymentMethods()`; `onMount` parses
  `params.get("tab") === "payments"` and loads the list when the session is active.
- `{:else if tab === "payments"}` renders `<AdminPayments />` (plain child component — no new island).

## 2. `AdminPayments.svelte` behavior

### List
- Flicker-free pattern: first load shows a placeholder (`methodsLoaded === false` only); after load,
  mutations patch the array in place. Each row: title, `type` label chip, `isActive` state, an edit
  button, an activate/deactivate toggle and a delete button.
- Per-row `busy` state (`class:busy` + `aria-busy`); inline `methodsError` is preserved on failure and the
  previous list stays visible (FR-004 / feature-015 pattern).

### Create / edit modal
- Fields driven by `PAYMENT_METHOD_FIELDS[type]` from `src/lib/utils/payments.ts`:
  - a `type` `<select>` whose change re-renders the detail fields;
  - `<input>`s for each descriptor key (marked required per the descriptor);
  - a `title` input (required);
  - an `instructions` textarea (optional).
- Client-side validation mirrors the data layer: missing title or a missing required detail key refuses
  the save with an inline message and creates nothing (FR-006).
- On success the modal closes and the list patches in place (create returns the record; edit returns the
  updated record) — no full refetch, no blanking (FR-004/FR-010).

### Toggle & delete
- Toggle calls `togglePaymentMethodActive`; the row's state flips from the returned record.
- Delete asks for confirmation, then calls `deletePaymentMethod`; on confirm the row is removed only after
  the promise resolves. Deletion never mutates existing bookings (FR-005).

## 3. Tokens & accessibility

- All colors/spacing/radii from tokens; the new **Métodos de Pago** UI uses existing card/button tokens.
- Controls ≥ 44×44px; modal traps nothing that blocks keyboard use; `Esc` closes the modal; focus returns
  to the invoking control; labels are programmatically associated; list/entry transitions are suppressed
  under `prefers-reduced-motion`.
- 320–1920px with no horizontal page scroll; long instructions/titles wrap.

## 4. Acceptance mapping

FR-001…FR-007, FR-028 → this contract; verified by `quickstart.md` scenario 2.
