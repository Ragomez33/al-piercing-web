/**
 * Catalog change notifications.
 *
 * Keeps the public catalog in sync with admin edits (publish/hide/stock) without
 * coupling components to Supabase (constitution §2.3). Covers:
 * - Demo/LocalStorage: cross-tab `storage` events.
 * - Production: Supabase Realtime changes on `public.products` (best-effort).
 * - Always: tab focus / visibility return (catches anything missed).
 *
 * A same-tab custom event lets co-mounted components (e.g. the cart) request a
 * catalog refresh after detecting a stale product.
 */
import { getSupabaseClient } from "../data/supabase-client";
import { dataStore } from "../data/store";

/** Same-tab signal that products changed and listeners should refresh. */
export const PRODUCTS_CHANGED_EVENT = "alpi:products-changed";

/** Dispatches the same-tab products-changed event. */
export function emitProductsChanged(): void {
  window.dispatchEvent(new CustomEvent(PRODUCTS_CHANGED_EVENT));
}

/**
 * Subscribes to product changes and invokes `onChange` whenever they may have
 * occurred. Returns an unsubscribe function (safe to return from `onMount`).
 */
export function subscribeToProductChanges(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("alpi:products")) onChange();
  };
  const onCustom = () => onChange();
  const onFocus = () => onChange();
  const onVisible = () => {
    if (!document.hidden) onChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(PRODUCTS_CHANGED_EVENT, onCustom);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);

  let channel: { unsubscribe: () => void } | null = null;
  if (dataStore.mode === "production") {
    try {
      channel = getSupabaseClient()
        .channel("products-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => onChange(),
        )
        .subscribe();
    } catch {
      // Realtime unavailable → focus/storage/custom events still cover refreshes.
      channel = null;
    }
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PRODUCTS_CHANGED_EVENT, onCustom);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisible);
    channel?.unsubscribe();
  };
}
