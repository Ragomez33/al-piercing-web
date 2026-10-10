/**
 * Unified hybrid data layer (FR-001/FR-002/FR-003).
 * Selects the adapter once at module init based on the presence of public Supabase
 * environment variables; every module reads/writes through this facade.
 */
import type { DataMode, DataStore, TeamMember } from "../types/domain";
import type { PiercingService } from "./services";
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

/**
 * Demo-seed services served by the local adapter. Used as a non-blocking fallback
 * when a live `listServices()` read fails (feature 011 FR-012); components never
 * import the hardcoded service list directly.
 */
export async function listFallbackServices(): Promise<PiercingService[]> {
  return createLocalAdapter().listServices();
}

/**
 * Demo-seed team members served by the local adapter. Used as a non-blocking
 * fallback when a live `listTeamMembers()` read fails (feature 012); components
 * never import the hardcoded seed directly.
 */
export async function listFallbackTeamMembers(): Promise<TeamMember[]> {
  return createLocalAdapter().listTeamMembers();
}