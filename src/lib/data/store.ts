/**
 * Unified hybrid data layer (FR-001/FR-002/FR-003).
 * Selects the adapter once at module init based on the presence of public Supabase
 * environment variables; every module reads/writes through this facade.
 */
import type { DataMode, DataStore, GalleryItemRecord, TeamMember } from "../types/domain";
import type { PiercingService } from "./services";
import { createLocalAdapter } from "./adapters/local";
import { createSupabaseAdapter } from "./adapters/supabase";
import { publishDataChange } from "./realtime";

export { DataError } from "../types/domain";

export function resolveMode(): DataMode {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const ready =
    typeof url === "string" && url.length > 0 && typeof anon === "string" && anon.length > 0;
  return ready ? "production" : "demo";
}

/**
 * Wraps an adapter so that successful mutations publish a change notification
 * (feature 015). Throwing mutations publish nothing, so subscribers never react to
 * a failed write. Components never publish directly (constitution: Data Access).
 */
function withChangeNotifications(adapter: DataStore): DataStore {
  return {
    ...adapter,
    async createService(input) {
      const record = await adapter.createService(input);
      publishDataChange("services");
      return record;
    },
    async updateService(id, patch) {
      const record = await adapter.updateService(id, patch);
      publishDataChange("services");
      return record;
    },
    async deleteService(id) {
      await adapter.deleteService(id);
      publishDataChange("services");
    },
    async createProduct(input) {
      const record = await adapter.createProduct(input);
      publishDataChange("products");
      return record;
    },
    async updateProduct(id, patch) {
      const record = await adapter.updateProduct(id, patch);
      publishDataChange("products");
      return record;
    },
    async createTeamMember(input) {
      const record = await adapter.createTeamMember(input);
      publishDataChange("team");
      return record;
    },
    async updateTeamMember(id, patch) {
      const record = await adapter.updateTeamMember(id, patch);
      publishDataChange("team");
      return record;
    },
    async deleteTeamMember(id) {
      await adapter.deleteTeamMember(id);
      publishDataChange("team");
    },
    async createGalleryItem(input) {
      const record = await adapter.createGalleryItem(input);
      publishDataChange("gallery");
      return record;
    },
    async toggleGalleryItemActive(id) {
      const record = await adapter.toggleGalleryItemActive(id);
      publishDataChange("gallery");
      return record;
    },
    async deleteGalleryItem(id) {
      await adapter.deleteGalleryItem(id);
      publishDataChange("gallery");
    },
  };
}

export function createDataStore(): DataStore {
  const adapter = resolveMode() === "production" ? createSupabaseAdapter() : createLocalAdapter();
  return withChangeNotifications(adapter);
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

/**
 * Demo-seed gallery items served by the local adapter. Used as a non-blocking
 * fallback when a live `listGalleryItems()` read fails (feature 016); components
 * never import the hardcoded seed directly.
 */
export async function listFallbackGalleryItems(): Promise<GalleryItemRecord[]> {
  return createLocalAdapter().listGalleryItems();
}