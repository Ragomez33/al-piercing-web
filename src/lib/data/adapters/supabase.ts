/**
 * Production adapter — reads/writes Supabase using only the public anon key.
 * Uses the SHARED client (feature 005) so requests carry the authenticated session.
 * Rows are narrowed at the boundary; failures become typed DataError (no false-success writes).
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
  type ProductRecord,
  type SchedulePatch,
  type TimeBlock,
} from "../../types/domain";
import { calcDepositCents } from "../../utils/money";
import { PIERCING_SERVICES, type PiercingService } from "../services";
import { getSupabaseClient } from "../supabase-client";

interface BookingRow {
  id: string;
  created_at: string;
  client_name: string;
  client_whatsapp: string;
  service_id: string;
  service_name: string;
  price_cents: number;
  deposit_cents: number;
  booking_date: string;
  time_slot: string;
  status: string;
  notes?: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  stock: number;
  image: string;
  published: boolean;
}

interface TimeBlockRow {
  id: string;
  block_date: string;
  time_slot: string;
  duration_minutes: number;
  label: string;
}

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

export function createSupabaseAdapter(): DataStore {
  const mode: DataMode = "production";

  return {
    mode,

    async listServices(): Promise<PiercingService[]> {
      return PIERCING_SERVICES;
    },

    async listProducts({ includeUnpublished }): Promise<ProductRecord[]> {
      const client = getSupabaseClient();
      let query = client.from("products").select("*");
      if (!includeUnpublished) query = query.eq("published", true);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toProduct(row as unknown as ProductRow));
    },

    async createProduct(input: NewProductInput): Promise<ProductRecord> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("products")
        .insert({ name: input.name, category: input.category, price_cents: input.priceCents, stock: input.stock, image: input.image, published: true })
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toProduct(data as unknown as ProductRow);
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
      return toProduct(data as unknown as ProductRow);
    },

    async listBookings(input): Promise<Booking[]> {
      const client = getSupabaseClient();
      let query = client.from("bookings").select("*").order("booking_date").order("time_slot");
      if (input?.date) query = query.eq("booking_date", input.date);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toBooking(row as unknown as BookingRow));
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
      if (error) throw new DataError(error.message);
      return toBooking(data as unknown as BookingRow);
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
      return toBooking(data as unknown as BookingRow);
    },

    async getBookedSlots(date: string): Promise<string[]> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("bookings")
        .select("time_slot")
        .eq("booking_date", date)
        .in("status", ["PENDING", "CONFIRMED"]);
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => (row as unknown as { time_slot: string }).time_slot);
    },

    async listBlocks(input): Promise<TimeBlock[]> {
      const client = getSupabaseClient();
      let query = client.from("time_blocks").select("*").order("block_date").order("time_slot");
      if (input?.date) query = query.eq("block_date", input.date);
      const { data, error } = await query;
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => toTimeBlock(row as unknown as TimeBlockRow));
    },

    async createBlock(input: NewBlockInput): Promise<TimeBlock> {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("time_blocks")
        .insert({ block_date: input.date, time_slot: input.timeSlot, duration_minutes: input.durationMinutes, label: input.label })
        .select()
        .single();
      if (error) throw new DataError(error.message);
      return toTimeBlock(data as unknown as TimeBlockRow);
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
      if (error) throw new DataError(error.message);
      return toBooking(data as unknown as BookingRow);
    },

    async getBlockedSlots(date: string): Promise<string[]> {
      const client = getSupabaseClient();
      const { data, error } = await client.from("time_blocks").select("time_slot").eq("block_date", date);
      if (error) throw new DataError(error.message);
      return (data ?? []).map((row) => (row as unknown as { time_slot: string }).time_slot);
    },
  };
}