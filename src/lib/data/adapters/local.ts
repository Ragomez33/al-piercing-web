/**
 * Demo adapter — runs entirely in the browser (localStorage) with static seed content.
 * Versioned keys; writes replace the full array; every read narrows before use.
 */
import {
  DataError,
  type Booking,
  type BookingStatus,
  type DataStore,
  type NewBlockInput,
  type NewBookingInput,
  type NewProductInput,
  type ProductRecord,
  type SchedulePatch,
  type TimeBlock,
} from "../../types/domain";
import { PRODUCTS } from "../../types/content";
import { calcDepositCents } from "../../utils/money";
import { PIERCING_SERVICES, type NewServiceInput, type PiercingService } from "../services";

const BOOKINGS_KEY = "alpi:bookings:v1";
const PRODUCTS_KEY = "alpi:products:v1";
const BLOCKS_KEY = "alpi:timeblocks:v1";
const SERVICES_KEY = "alpi:services:v1";

function storage(): Storage {
  try {
    return window.localStorage;
  } catch {
    throw new DataError("Almacenamiento local no disponible");
  }
}

function seedBookings(): Booking[] {
  return [];
}

function seedBlocks(): TimeBlock[] {
  return [];
}

function seedProducts(): ProductRecord[] {
  return PRODUCTS.map((product) => ({ ...product, published: true }));
}

function seedServices(): PiercingService[] {
  return PIERCING_SERVICES.map((service) => ({ ...service }));
}

const SERVICE_CATEGORIES = ["NOSTRIL", "HELIX", "NAVEL", "TITANIO"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) return false;
  const status = value.status;
  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.clientName === "string" &&
    typeof value.clientWhatsapp === "string" &&
    (value.serviceId === null || typeof value.serviceId === "string") &&
    typeof value.serviceName === "string" &&
    typeof value.priceCents === "number" &&
    typeof value.depositCents === "number" &&
    typeof value.date === "string" &&
    typeof value.timeSlot === "string" &&
    (status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED")
  );
}

function isProductRecord(value: unknown): value is ProductRecord {
  if (!isRecord(value)) return false;
  const category = value.category;
  const categoryOk =
    category === "Argollas & Labrets" || category === "Zirconia & Navel" || category === "Aftercare";
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    categoryOk &&
    typeof value.priceCents === "number" &&
    typeof value.stock === "number" &&
    typeof value.image === "string" &&
    typeof value.published === "boolean"
  );
}

function isService(value: unknown): value is PiercingService {
  if (!isRecord(value)) return false;
  const category = value.category;
  const categoryOk =
    category === "NOSTRIL" ||
    category === "HELIX" ||
    category === "NAVEL" ||
    category === "TITANIO";
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    categoryOk &&
    typeof value.priceCents === "number" &&
    typeof value.durationMinutes === "number" &&
    typeof value.description === "string" &&
    typeof value.requiresDeposit === "boolean" &&
    typeof value.active === "boolean"
  );
}

/** Shared validation for create/update (demo parity with the DB checks). */
function validateService(input: NewServiceInput): void {
  if (input.name.trim().length === 0) {
    throw new DataError("El nombre es obligatorio");
  }
  if (!(SERVICE_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new DataError("Categoría de servicio inválida");
  }
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    throw new DataError("El precio debe ser un entero mayor o igual a 0 (centavos)");
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new DataError("La duración debe ser un entero mayor a 0 (minutos)");
  }
}

function isTimeBlock(value: unknown): value is TimeBlock {
  if (!isRecord(value)) return false;
  const duration = value.durationMinutes;
  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.timeSlot === "string" &&
    (duration === 15 || duration === 30 || duration === 60 || duration === 90 || duration === 120) &&
    typeof value.label === "string"
  );
}

async function readArray<T>(key: string, fallback: T[], guard: (v: unknown) => v is T): Promise<T[]> {
  let raw: string | null = null;
  try {
    raw = storage().getItem(key);
  } catch {
    return fallback;
  }
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(guard) : fallback;
  } catch {
    return fallback;
  }
}

function writeArray<T>(key: string, items: T[]): Promise<void> {
  try {
    storage().setItem(key, JSON.stringify(items));
    return Promise.resolve();
  } catch {
    return Promise.reject(new DataError("No se pudo guardar en el almacenamiento local"));
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createLocalAdapter(): DataStore {
  return {
    mode: "demo",

    async listServices(input): Promise<PiercingService[]> {
      const services = await readArray(SERVICES_KEY, seedServices(), isService);
      return input?.includeInactive ? services : services.filter((service) => service.active);
    },

    async createService(input: NewServiceInput): Promise<PiercingService> {
      validateService(input);
      const services = await readArray(SERVICES_KEY, seedServices(), isService);
      const record: PiercingService = { ...input, name: input.name.trim(), id: newId(), active: true };
      await writeArray(SERVICES_KEY, [...services, record]);
      return record;
    },

    async updateService(id, patch): Promise<PiercingService> {
      const services = await readArray(SERVICES_KEY, seedServices(), isService);
      const current = services.find((service) => service.id === id);
      if (!current) throw new DataError("Servicio no encontrado");
      const merged: PiercingService = { ...current, ...patch };
      validateService(merged);
      const next = services.map((service) => (service.id === id ? merged : service));
      await writeArray(SERVICES_KEY, next);
      return merged;
    },

    async deleteService(id: string): Promise<void> {
      const services = await readArray(SERVICES_KEY, seedServices(), isService);
      if (!services.some((service) => service.id === id)) {
        throw new DataError("Servicio no encontrado");
      }
      await writeArray(SERVICES_KEY, services.filter((service) => service.id !== id));
    },

    async listProducts({ includeUnpublished }): Promise<ProductRecord[]> {
      const products = await readArray(PRODUCTS_KEY, seedProducts(), isProductRecord);
      return includeUnpublished ? products : products.filter((product) => product.published);
    },

    async createProduct(input: NewProductInput): Promise<ProductRecord> {
      const products = await readArray(PRODUCTS_KEY, seedProducts(), isProductRecord);
      const record: ProductRecord = { ...input, id: newId(), published: true };
      await writeArray(PRODUCTS_KEY, [...products, record]);
      return record;
    },

    async updateProduct(id, patch): Promise<ProductRecord> {
      const products = await readArray(PRODUCTS_KEY, seedProducts(), isProductRecord);
      let updated: ProductRecord | undefined;
      const next = products.map((product) =>
        product.id === id ? ((updated = { ...product, ...patch }), updated) : product,
      );
      if (!updated) throw new DataError("Producto no encontrado");
      await writeArray(PRODUCTS_KEY, next);
      return updated;
    },

    async listBookings(input): Promise<Booking[]> {
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking);
      return input?.date ? bookings.filter((booking) => booking.date === input.date) : bookings;
    },

    async createBooking(input: NewBookingInput): Promise<Booking> {
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking);
      // Active-slot exclusivity parity with the production partial unique index
      // (feature 009): a second PENDING/CONFIRMED request for the same date+time
      // is rejected so demo and production behave identically (FR-014).
      const taken = bookings.some(
        (booking) =>
          booking.date === input.date &&
          booking.timeSlot === input.timeSlot &&
          (booking.status === "PENDING" || booking.status === "CONFIRMED"),
      );
      if (taken) throw new DataError("Ese horario ya fue solicitado. Elegí otro horario.");
      const record: Booking = {
        id: newId(),
        createdAt: new Date().toISOString(),
        clientName: input.clientName,
        clientWhatsapp: input.clientWhatsapp,
        serviceId: input.serviceId,
        serviceName: input.serviceName,
        priceCents: input.priceCents,
        depositCents: calcDepositCents(input.priceCents),
        date: input.date,
        timeSlot: input.timeSlot,
        status: "PENDING",
        notes: input.notes,
      };
      await writeArray(BOOKINGS_KEY, [...bookings, record]);
      return record;
    },

    async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking);
      let updated: Booking | undefined;
      const next = bookings.map((booking) =>
        booking.id === id ? ((updated = { ...booking, status }), updated) : booking,
      );
      if (!updated) throw new DataError("Reserva no encontrada");
      await writeArray(BOOKINGS_KEY, next);
      return updated;
    },

    async getBookedSlots(date: string): Promise<string[]> {
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking);
      return bookings
        .filter(
          (booking) =>
            booking.date === date &&
            (booking.status === "PENDING" || booking.status === "CONFIRMED"),
        )
        .map((booking) => booking.timeSlot);
    },

    async listBlocks(input): Promise<TimeBlock[]> {
      const blocks = await readArray(BLOCKS_KEY, seedBlocks(), isTimeBlock);
      return input?.date ? blocks.filter((block) => block.date === input.date) : blocks;
    },

    async createBlock(input: NewBlockInput): Promise<TimeBlock> {
      const blocks = await readArray(BLOCKS_KEY, seedBlocks(), isTimeBlock);
      const record: TimeBlock = { ...input, id: newId() };
      await writeArray(BLOCKS_KEY, [...blocks, record]);
      return record;
    },

    async deleteBlock(id: string): Promise<void> {
      const blocks = await readArray(BLOCKS_KEY, seedBlocks(), isTimeBlock);
      const next = blocks.filter((block) => block.id !== id);
      await writeArray(BLOCKS_KEY, next);
    },

    async updateBookingSchedule(id: string, patch: SchedulePatch): Promise<Booking> {
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking);
      let updated: Booking | undefined;
      const next = bookings.map((booking) =>
        booking.id === id
          ? ((updated = { ...booking, date: patch.date, timeSlot: patch.timeSlot }), updated)
          : booking,
      );
      if (!updated) throw new DataError("Reserva no encontrada");
      await writeArray(BOOKINGS_KEY, next);
      return updated;
    },

    async getBlockedSlots(date: string): Promise<string[]> {
      const blocks = await readArray(BLOCKS_KEY, seedBlocks(), isTimeBlock);
      return blocks.filter((block) => block.date === date).map((block) => block.timeSlot);
    },
  };
}