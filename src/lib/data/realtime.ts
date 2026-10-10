/**
 * Cross-tab / cross-client data-change notifications (feature 015).
 *
 * Consumers subscribe to a set of resources and re-fetch only what changed when a
 * notification arrives. The publisher is the mutation-notifying `dataStore` wrapper in
 * `store.ts` (components never publish directly).
 *
 * Transports:
 * - demo/browser: `BroadcastChannel` (fallback: `storage` events) for same-browser tabs.
 * - production: Supabase Realtime `postgres_changes` on `services`/`team_members`/`products`.
 * - always: a `visibilitychange` fallback so returning to the tab refreshes.
 *
 * SSR-safe: every browser API is guarded, and publishing on the server is a no-op.
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client";

export type DataResource = "services" | "team" | "products";

export interface DataChangeEvent {
  resource: DataResource;
  /** Opaque emitter id, so a subscriber can distinguish origins if needed. */
  origin: string;
  /** Epoch ms. */
  at: number;
}

type Listener = (event: DataChangeEvent) => void;

interface Subscription {
  resources: ReadonlySet<DataResource>;
  listener: Listener;
}

const CHANNEL_NAME = "alpi:data";
const STORAGE_KEY = "alpi:data-change";
const RESOURCES: readonly DataResource[] = ["services", "team", "products"];
const ORIGIN = `alpi-${Math.random().toString(36).slice(2, 10)}`;

const subscriptions = new Set<Subscription>();

let channel: BroadcastChannel | null = null;
let storageHandler: ((event: StorageEvent) => void) | null = null;
let visibilityHandler: (() => void) | null = null;
let realtimeStarted = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isResource(value: unknown): value is DataResource {
  return typeof value === "string" && (RESOURCES as readonly string[]).includes(value);
}

function parseEvent(data: unknown): DataChangeEvent | null {
  if (typeof data !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (!isResource(record.resource)) return null;
    return {
      resource: record.resource,
      origin: typeof record.origin === "string" ? record.origin : "unknown",
      at: typeof record.at === "number" ? record.at : Date.now(),
    };
  } catch {
    return null;
  }
}

function watchedResources(): Set<DataResource> {
  const all = new Set<DataResource>();
  for (const sub of subscriptions) {
    for (const resource of sub.resources) all.add(resource);
  }
  return all;
}

function dispatch(event: DataChangeEvent): void {
  for (const sub of subscriptions) {
    if (sub.resources.has(event.resource)) sub.listener(event);
  }
}

function broadcastLocal(event: DataChangeEvent): void {
  if (channel) {
    try {
      channel.postMessage(event);
      return;
    } catch {
      // Fall through to the storage fallback.
    }
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch {
    // Storage unavailable — nothing else to do.
  }
}

function startRealtime(): void {
  if (realtimeStarted || !isSupabaseConfigured()) return;
  realtimeStarted = true;
  try {
    const client = getSupabaseClient();
    const notify = (resource: DataResource) => () => dispatch({ resource, origin: "supabase", at: Date.now() });
    client
      .channel("alpi-data-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, notify("services"))
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, notify("team"))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, notify("products"))
      .subscribe();
  } catch {
    // Realtime not available — the visibility fallback still refreshes on focus.
  }
}

function stopTransports(): void {
  if (channel) {
    try {
      channel.close();
    } catch {
      // ignore
    }
    channel = null;
  }
  if (storageHandler) {
    window.removeEventListener("storage", storageHandler);
    storageHandler = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
}

function ensureStarted(): void {
  if (!isBrowser()) return;

  if (!channel && !storageHandler) {
    if (typeof BroadcastChannel === "function") {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (message: MessageEvent) => {
        const event = parseEvent(message.data);
        if (event) dispatch(event);
      };
    } else {
      storageHandler = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY || !event.newValue) return;
        const parsed = parseEvent(event.newValue);
        if (parsed) dispatch(parsed);
      };
      window.addEventListener("storage", storageHandler);
    }
  }

  if (!visibilityHandler) {
    visibilityHandler = () => {
      if (document.visibilityState !== "visible") return;
      const at = Date.now();
      for (const resource of watchedResources()) {
        dispatch({ resource, origin: "focus", at });
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }

  startRealtime();
}

/** Publishes a change notification. No-op on the server. Never throws. */
export function publishDataChange(resource: DataResource): void {
  if (!isBrowser()) return;
  const event: DataChangeEvent = { resource, origin: ORIGIN, at: Date.now() };
  broadcastLocal(event);
  dispatch(event);
}

/**
 * Subscribes to change notifications for the given resources. Returns an unsubscribe
 * function. Never throws.
 */
export function subscribeToDataChanges(
  resources: readonly DataResource[],
  listener: Listener,
): () => void {
  const subscription: Subscription = { resources: new Set(resources), listener };
  subscriptions.add(subscription);
  ensureStarted();
  return () => {
    subscriptions.delete(subscription);
    if (subscriptions.size === 0) stopTransports();
  };
}
