/**
 * Production adapter — reads/writes Supabase using only the public anon key.
 * Uses the SHARED, TYPED client (`SupabaseClient<Database>`, feature 005/006) so requests carry the
 * authenticated session and rows arrive already typed — no manual `as unknown as` casts.
 * Failures become typed DataError (no false-success writes).
 */
import {
  DataError,
  type Booking,
  type BookingStatus,
  type DataMode,
  type DataStore,
  type NewBlockInput,
  type NewBookingInput,
  type NewProductInput,
  type NewTeamMemberInput,
  type ProductRecord,
  type SchedulePatch,
  type TeamMember,
  type TimeBlock,
} from "../../types/domain";
import type { Database } from "../../../types/supabase";
import { calcDepositCents } from "../../utils/money";
import type { NewServiceInput, PiercingService } from "../services";
import { getSupabaseClient } from "../supabase-client";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type TimeBlockRow = Database["public"]["Tables"]["time_blocks"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type TeamRow = Database["public"]["Tables"]["team_members"]["Row"];

function toTimeBlock(row: TimeBlockRow): TimeBlock {
  const duration = row.duration_minutes;
  if (duration !== 15 && duration !== 30 && duration !== 60 && duration !== 90 && duration !== 120) {
    throw new DataError(`Duración de bloqueo inválida: ${duration}`);
  }
  return {
    id: row.id,
    date: row.block_date,
    timeSlot: row.time_slot,
    durationMinutes: duration,
    label: row.label,
  };
}

function toBooking(row: BookingRow): Booking {
  const status: BookingStatus =
    row.status === "CONFIRMED" ? "CONFIRMED" : row.status === "CANCELLED" ? "CANCELLED" : "PENDING";
  return {
    id: row.id,
    createdAt: row.created_at,
    clientName: row.client_name,
    clientWhatsapp: row.client_whatsapp,
    serviceId: row.service_id,
    serviceName: row.service_name,
    priceCents: row.price_cents,
    depositCents: row.deposit_cents,
    date: row.booking_date,
    timeSlot: row.time_slot,
    status,
    notes: row.notes ?? undefined,
  };
}

function toProduct(row: ProductRow): ProductRecord {
  const category = row.category;
  if (category !== "Argollas & Labrets" && category !== "Zirconia & Navel" && category !== "Aftercare") {
    throw new DataError(`Categoría de producto inválida: ${category}`);
  }
  return {
    id: row.id,
    name: row.name,
    category,
    priceCents: row.price_cents,
    stock: row.stock,
    image: row.image,
    published: row.published,
  };
}

function toService(row: ServiceRow): PiercingService {
  const category = row.category;
  if (category !== "NOSTRIL" && category !== "HELIX" && category !== "NAVEL" && category !== "TITANIO") {
    throw new DataError(`Categoría de servicio inválida: ${category}`);
  }
  return {
    id: row.id,
    name: row.name,
    category,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes,
    description: row.description,
    requiresDeposit: row.requires_deposit,
    active: row.active,
  };
}

function requireRow<T>(data: T | null, label: string): T {
  if (!data) throw new DataError(`${label} no se devolvió`);
  return data;
}

/** Trims and strips a single leading `@` so handles are stored bare. */
function normalizeInstagram(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function toTeamMember(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    instagramHandle: row.instagram_handle,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Maps Postgres errors to typed, user-facing `DataError`s (feature 009).
 * A unique-violation (`23505`) on the active-slot partial index becomes the
 * friendly duplicate-slot message (research R7, FR-007/FR-012).
 */
function toDataError(error: { message: string; code?: string }): DataError {
  if (error.code === "23505") {
    return new DataError("Ese horario ya fue solicitado. Elegí otro horario.");
  }
  return new DataError(error.message);
}

export function createSupabaseAdapter(): DataStore {
  const mode: DataMode = "production";

  return {
    mode,

    async listServices(input): Promise<PiercingService[]> {
      const client = getSupabaseClient();
      let query = client.from("services").select("*").order("name", { ascending: true });
      if (!input?.includeInactive) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toService(row));
    },

    async createService(input: NewServiceInput): Promise<PiercingService> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("services")
        .insert({
          name: input.name.trim(),
          category: input.category,
          description: input.description,
          price_cents: input.priceCents,
          duration_minutes: input.durationMinutes,
          requires_deposit: input.requiresDeposit,
          active: true,
        })
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toService(requireRow(data, "El servicio"));
    },

    async updateService(id, patch): Promise<PiercingService> {
      const client = getSupabaseClient();
      const update: Database["public"]["Tables"]["services"]["Update"] = {};
      if (patch.name !== undefined) update.name = patch.name.trim();
      if (patch.category !== undefined) update.category = patch.category;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.priceCents !== undefined) update.price_cents = patch.priceCents;
      if (patch.durationMinutes !== undefined) update.duration_minutes = patch.durationMinutes;
      if (patch.requiresDeposit !== undefined) update.requires_deposit = patch.requiresDeposit;
      if (patch.active !== undefined) update.active = patch.active;
      const { data, error } = await client
        .from("services")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toService(requireRow(data, "El servicio"));
    },

    async deleteService(id: string): Promise<void> {
      const client = getSupabaseClient();
      const { error } = await client.from("services").delete().eq("id", id);
      if (error) throw new DataError(error.message);
    },

    async listProducts({ includeUnpublished }): Promise<ProductRecord[]> {
      const client = getSupabaseClient();
      let query = client.from("products").select("*");
      if (!includeUnpublished) query = query.eq("published", true);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toProduct(row));
    },

    async createProduct(input: NewProductInput): Promise<ProductRecord> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("products")
        .insert({ id: crypto.randomUUID(), name: input.name, category: input.category, price_cents: input.priceCents, stock: input.stock, image: input.image, published: true })
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toProduct(requireRow(data, "El producto"));
    },

    async updateProduct(id, patch): Promise<ProductRecord> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("products")
        .update({ stock: patch.stock, published: patch.published })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toProduct(requireRow(data, "El producto"));
    },

    async listBookings(input): Promise<Booking[]> {
      const client = getSupabaseClient();
      let query = client.from("bookings").select("*").order("booking_date").order("time_slot");
      if (input?.date) query = query.eq("booking_date", input.date);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toBooking(row));
    },

    async createBooking(input: NewBookingInput): Promise<Booking> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("bookings")
        .insert({
          client_name: input.clientName,
          client_whatsapp: input.clientWhatsapp,
          service_id: input.serviceId,
          service_name: input.serviceName,
          price_cents: input.priceCents,
          deposit_cents: calcDepositCents(input.priceCents),
          booking_date: input.date,
          time_slot: input.timeSlot,
          status: "PENDING",
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw toDataError(error);
      return toBooking(requireRow(data, "La reserva"));
    },

    async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("bookings")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toBooking(requireRow(data, "La reserva"));
    },

    async getBookedSlots(date: string): Promise<string[]> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("bookings")
        .select("time_slot")
        .eq("booking_date", date)
        .in("status", ["PENDING", "CONFIRMED"]);
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => row.time_slot);
    },

    async listBlocks(input): Promise<TimeBlock[]> {
      const client = getSupabaseClient();
      let query = client.from("time_blocks").select("*").order("block_date").order("time_slot");
      if (input?.date) query = query.eq("block_date", input.date);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toTimeBlock(row));
    },

    async createBlock(input: NewBlockInput): Promise<TimeBlock> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("time_blocks")
        .insert({ block_date: input.date, time_slot: input.timeSlot, duration_minutes: input.durationMinutes, label: input.label })
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toTimeBlock(requireRow(data, "El bloqueo"));
    },

    async deleteBlock(id: string): Promise<void> {
      const client = getSupabaseClient();
      const { error } = await client.from("time_blocks").delete().eq("id", id);
      if (error) throw new DataError(error.message);
    },

    async updateBookingSchedule(id: string, patch: SchedulePatch): Promise<Booking> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("bookings")
        .update({ booking_date: patch.date, time_slot: patch.timeSlot })
        .eq("id", id)
        .select()
        .single();
      if (error) throw toDataError(error);
      return toBooking(requireRow(data, "La reserva"));
    },

    async getBlockedSlots(date: string): Promise<string[]> {
      const client = getSupabaseClient();
      const { data, error } = await client.from("time_blocks").select("time_slot").eq("block_date", date);
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => row.time_slot);
    },

    async listTeamMembers(input): Promise<TeamMember[]> {
      const client = getSupabaseClient();
      let query = client
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true });
      if (!input?.includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toTeamMember(row));
    },

    async createTeamMember(input: NewTeamMemberInput): Promise<TeamMember> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("team_members")
        .insert({
          name: input.name.trim(),
          role: input.role.trim(),
          avatar_url: input.avatarUrl,
          bio: input.bio,
          instagram_handle: normalizeInstagram(input.instagramHandle),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toTeamMember(requireRow(data, "El miembro"));
    },

    async updateTeamMember(id, patch): Promise<TeamMember> {
      const client = getSupabaseClient();
      const update: Database["public"]["Tables"]["team_members"]["Update"] = {};
      if (patch.name !== undefined) update.name = patch.name.trim();
      if (patch.role !== undefined) update.role = patch.role.trim();
      if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl;
      if (patch.bio !== undefined) update.bio = patch.bio;
      if (patch.instagramHandle !== undefined) {
        update.instagram_handle = normalizeInstagram(patch.instagramHandle);
      }
      if (patch.isActive !== undefined) update.is_active = patch.isActive;
      const { data, error } = await client
        .from("team_members")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toTeamMember(requireRow(data, "El miembro"));
    },

    async deleteTeamMember(id: string): Promise<void> {
      const client = getSupabaseClient();
      const { error } = await client.from("team_members").delete().eq("id", id);
      if (error) throw new DataError(error.message);
    },
  };
}