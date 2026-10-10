# Contract: Admin List State (Flicker-Free Mutations)

**Feature**: `015-landing-v2-ux-overhaul` | Applies to `src/components/admin/AdminPanel.svelte`
(catalog / services / team tabs).

## 1. List shape

Each managed list tracks:

```ts
{ items: T[], hasLoaded: boolean, loading: boolean, error: string, busy: Record<string, boolean> }
```

- The full "Cargando…" placeholder renders **only when `!hasLoaded`** (first load for the tab).
- Once `hasLoaded` is `true`, the list is never replaced by the placeholder again.
- `loading` on a re-fetch MUST NOT erase `items`; the previous rows stay mounted.

## 2. Mutation handling (create / update / toggle / delete)

1. On start: set `busy[id] = true` (existing `svBusy` / `saving` / `tmBusy` / `deleting`), clear the
   inline error, keep all rows rendered and scroll position unchanged.
2. `await` the data-layer mutation. The store both persists and emits a change event
   (`data-sync-contract.md`).
3. On success, **patch `items` from the returned record — do NOT call `refreshX()`**:
   - create → append the returned record;
   - update/toggle → replace the item with the same `id` by the returned record; clear its draft
     (`stockDraft`);
   - delete → remove the item with that `id`.
4. On failure: keep the previous `items` and the row, set the inline error, clear `busy[id]`.
5. `busy[id]` is cleared in a `finally`, so controls re-enable regardless of outcome.

Full re-fetch (`refreshX()`) is reserved for the **first** load of a tab and auth bootstrap.

## 3. Prohibited

- Calling `refreshCatalog()/refreshServices()/refreshTeam()` immediately after every mutation when the
  list is already loaded (this is the flicker source).
- Toggling a list-wide `loading` flag (that folds the `{#if loading}` block) on a mutation.
- Optimistically removing/adding a row **before** the promise resolves (failure must preserve data).
- Silent drops: a failed mutation MUST surface a visible inline error.

## 4. Required affordances

- Per-row busy state: disabled controls + a subtle inline busy cue (token-styled, short skeleton or
  spinner; suppressed under `prefers-reduced-motion`).
- Inline error text near the list (`servicesError` / `productsError` / `teamError`), non-blocking.
- Rapid successive mutations keep the list stable (no duplicated/missing rows, no flicker).

## 5. Acceptance mapping

FR-016, FR-017, FR-018, FR-019 → §1–§4. Verified by `quickstart.md` scenario 6.
