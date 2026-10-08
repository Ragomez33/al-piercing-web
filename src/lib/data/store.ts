/**
 * Unified hybrid data layer (FR-001/FR-002/FR-003).
 * Selects the adapter once at module init based on the presence of public Supabase
 * environment variables; every module reads/writes through this facade.
 */
import type { DataMode, DataStore } from "../types/domain";
import { createLocalAdapter } from "./adapters/local";
import { createSupabaseAdapter } from "./adapters/supabase";

export { DataError } from "../types/domain";

export function resolveMode(): DataMode {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const ready =
    typeof url === "string" && url.length > 0 && typeof anon === "string" && anon.length > 0;
  return ready ? "production" : "demo";
}

export function createDataStore(): DataStore {
  const adapter = resolveMode() === "production" ? createSupabaseAdapter() : createLocalAdapter();
  return adapter;
}

/** Shared singleton consumed by all pages/islands. */
export const dataStore: DataStore = createDataStore();