# Contract: Data Change Subscription (`subscribeToDataChanges`)

**Feature**: `015-landing-v2-ux-overhaul` | Lives in `src/lib/data/realtime.ts` (published from a
mutation-notifying wrapper in `src/lib/data/store.ts`); consumed by `LandingV2Services.svelte` and
`TeamSection.svelte`.

## 1. Signature

```ts
type DataResource = "services" | "team" | "products";

interface DataChangeEvent {
  resource: DataResource;
  origin: string; // emitter id (tab/session)
  at: number;     // epoch ms
}

/** Subscribes to change notifications. Returns an unsubscribe function. Never throws. */
export function subscribeToDataChanges(
  resources: readonly DataResource[],
  listener: (event: DataChangeEvent) => void,
): () => void;
```

## 2. Publishing

- The shared `dataStore` returned by `createDataStore()` is wrapped so that a **successful**
  `createService`/`updateService`/`deleteService` emits `{ resource: "services" }`;
  `createTeamMember`/`updateTeamMember`/`deleteTeamMember` emits `{ resource: "team" }`;
  `createProduct`/`updateProduct` emits `{ resource: "products" }`.
- A mutation that throws emits **nothing** (no false notifications).
- Components/pages MUST NOT publish events directly; emission is a data-layer concern
  (constitution "Data Access").

## 3. Transport

| Mode | Mechanism |
|------|-----------|
| `demo` | `BroadcastChannel("alpi:data")` for cross-tab delivery, plus a `window` `storage` listener (localStorage writes fire `storage` in other same-origin tabs) as a fallback. |
| `production` | Supabase Realtime `postgres_changes` (`INSERT`/`UPDATE`/`DELETE`) on `services` and `team_members` (and `products` only if a consumer subscribes to it) through the existing shared client. |
| Always | Re-check on `window` `visibilitychange`/`focus`, so a subscriber refreshes when the tab becomes active even if Realtime is not enabled. |

## 4. Subscriber rules

- Re-fetch **only** the affected resource(s) via the data layer; ignore resources not in the
  subscriber's `resources` list.
- Coalesce bursts: debounce rapid events (e.g., trailing ~150 ms) and skip a re-fetch already in flight.
- Patch the rendered state **in place**; never blank the section or reset scroll position.
- Unsubscribe on component destroy (`onMount` returns the unsubscribe; `onDestroy`/Svelte cleanup).
- On transport failure or a failed re-fetch: keep the last known content, remain usable, and never
  throw to the UI.

## 5. Guarantees

- Idempotent: a missed event is covered by the focus fallback and the next event.
- Zero idle cost: no polling; no work when nothing changes.
- No new runtime dependency and no schema/migration change (Supabase Realtime is an optional
  deployment publication).

## 6. Acceptance mapping

FR-009, FR-010 → §2–§4. Verified by `quickstart.md` scenario 5.
