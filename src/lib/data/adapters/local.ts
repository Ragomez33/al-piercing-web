/**
 * Demo adapter — runs entirely in the browser (localStorage) with static seed content.
 * Versioned keys; writes replace the full array; every read narrows before use.
 */
import {
  DataError,
  type AvailabilityBlock,
  type Booking,
  type BookingEvent,
  type BookingStatus,
  type DataStore,
  type GalleryItemRecord,
  type NewAvailabilityBlockInput,
  type NewBookingInput,
  type NewGalleryItemInput,
  type NewPaymentMethodInput,
  type NewProductInput,
  type NewTeamMemberInput,
  type PaymentMethod,
  type ProductRecord,
  type SchedulePatch,
  type StudioSchedule,
  type StudioScheduleDay,
  type TeamMember,
} from "../../types/domain";
import { WEEKDAY_ORDER } from "../../types/domain";
import { PRODUCTS } from "../../types/content";
import { calcDepositCents } from "../../utils/money";
import {
  blockOverlapsDay,
  validateBlockInput,
  validateScheduleDayPatch,
} from "../../utils/availability";
import { validatePaymentMethodInput } from "../../utils/payments";
import { GALLERY_SEED } from "../gallery";
import { PAYMENT_METHOD_SEED } from "../payment-methods";
import { PIERCING_SERVICES, type NewServiceInput, type PiercingService } from "../services";
import { DEFAULT_SCHEDULE_SEED } from "../schedule";
import { TEAM_MEMBERS } from "../team";

const BOOKINGS_KEY = "alpi:bookings:v1";
const PRODUCTS_KEY = "alpi:products:v1";
const AVAILABILITY_BLOCKS_KEY = "alpi:availabilityblocks:v1";
const SCHEDULE_KEY = "alpi:studioschedule:v1";
const SERVICES_KEY = "alpi:services:v1";
const TEAM_KEY = "alpi:team:v1";
const GALLERY_KEY = "alpi:gallery:v1";
const PAYMENT_METHODS_KEY = "alpi:paymentmethods:v1";
const BOOKING_EVENTS_KEY = "alpi:bookingevents:v1";

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

function seedAvailabilityBlocks(): AvailabilityBlock[] {
  return [];
}

function seedSchedule(): StudioSchedule {
  return DEFAULT_SCHEDULE_SEED.map((day) => ({
    ...day,
    openTime: day.openTime,
    closeTime: day.closeTime,
  }));
}

function seedProducts(): ProductRecord[] {
  return PRODUCTS.map((product) => ({ ...product, published: true }));
}

function seedServices(): PiercingService[] {
  return PIERCING_SERVICES.map((service) => ({ ...service }));
}

function seedTeamMembers(): TeamMember[] {
  return TEAM_MEMBERS.map((member) => ({ ...member }));
}

function seedGalleryItems(): GalleryItemRecord[] {
  return GALLERY_SEED.map((item) => ({ ...item }));
}

function seedPaymentMethods(): PaymentMethod[] {
  return PAYMENT_METHOD_SEED.map((method) => ({ ...method, details: { ...method.details } }));
}

function seedBookingEvents(): BookingEvent[] {
  return [];
}

const SERVICE_CATEGORIES = ["NOSTRIL", "HELIX", "NAVEL", "TITANIO"] as const;

const BOOKING_STATUSES: readonly BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
];

function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) return false;
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
    isBookingStatus(value.status) &&
    // Payment fields are optional for records stored before feature 018; they are
    // normalized with defaults when read.
    (value.paymentMethodId === null ||
      value.paymentMethodId === undefined ||
      typeof value.paymentMethodId === "string") &&
    (value.paymentMethodName === undefined || typeof value.paymentMethodName === "string") &&
    (value.paymentReference === undefined || typeof value.paymentReference === "string") &&
    (value.paymentProofUrl === undefined || typeof value.paymentProofUrl === "string")
  );
}

/** Fills payment defaults so older stored rows satisfy the current `Booking` shape. */
function withPaymentDefaults(booking: Booking): Booking {
  return {
    ...booking,
    paymentMethodId: booking.paymentMethodId ?? null,
    paymentMethodName: booking.paymentMethodName ?? "",
    paymentReference: booking.paymentReference ?? "",
    paymentProofUrl: booking.paymentProofUrl ?? "",
  };
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  if (!isRecord(value)) return false;
  const type = value.type;
  const typeOk =
    type === "pago_movil" ||
    type === "binance" ||
    type === "zelle" ||
    type === "transfer" ||
    type === "cash";
  return (
    typeof value.id === "string" &&
    typeOk &&
    typeof value.title === "string" &&
    isRecord(value.details) &&
    typeof value.instructions === "string" &&
    typeof value.isActive === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function isBookingEvent(value: unknown): value is BookingEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.bookingId === "string" &&
    (value.fromStatus === null || isBookingStatus(value.fromStatus)) &&
    isBookingStatus(value.toStatus) &&
    typeof value.createdAt === "string"
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

function isTeamMember(value: unknown): value is TeamMember {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    typeof value.avatarUrl === "string" &&
    typeof value.bio === "string" &&
    typeof value.instagramHandle === "string" &&
    typeof value.isActive === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function isGalleryItem(value: unknown): value is GalleryItemRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.imageUrl === "string" &&
    typeof value.isActive === "boolean" &&
    typeof value.createdAt === "string"
  );
}

/** Trims and strips a single leading `@` so handles are stored bare. */
function normalizeInstagram(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

/** Shared validation for create/update (demo parity with the DB checks). */
function validateTeamMember(input: NewTeamMemberInput): void {
  if (input.name.trim().length === 0) {
    throw new DataError("El nombre es obligatorio");
  }
  if (input.role.trim().length === 0) {
    throw new DataError("El rol es obligatorio");
  }
}

function isAvailabilityBlock(value: unknown): value is AvailabilityBlock {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.startDatetime === "string" &&
    typeof value.endDatetime === "string" &&
    typeof value.reason === "string" &&
    typeof value.isFullDay === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function isStudioScheduleDay(value: unknown): value is StudioScheduleDay {
  if (!isRecord(value)) return false;
  const weekday = value.weekday;
  return (
    (weekday === "sun" ||
      weekday === "mon" ||
      weekday === "tue" ||
      weekday === "wed" ||
      weekday === "thu" ||
      weekday === "fri" ||
      weekday === "sat") &&
    typeof value.isOpen === "boolean" &&
    (value.openTime === null || typeof value.openTime === "string") &&
    (value.closeTime === null || typeof value.closeTime === "string")
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

/** Appends a status-transition record (feature 018); append-only, never throws on read. */
async function appendBookingEvent(
  bookingId: string,
  fromStatus: BookingStatus | null,
  toStatus: BookingStatus,
): Promise<void> {
  const events = await readArray(BOOKING_EVENTS_KEY, seedBookingEvents(), isBookingEvent);
  const event: BookingEvent = {
    id: newId(),
    bookingId,
    fromStatus,
    toStatus,
    createdAt: new Date().toISOString(),
  };
  await writeArray(BOOKING_EVENTS_KEY, [...events, event]);
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
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking).then((rows) =>
        rows.map(withPaymentDefaults),
      );
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
      if (taken) throw new DataError("Este horario ya no se encuentra disponible");
      const record: Booking = {
        id: newId(),
        createdAt: new Date().toISOString(),
        clientName: input.clientName,
        clientWhatsapp: input.clientWhatsapp,
        clientEmail: input.clientEmail,
        serviceId: input.serviceId,
        serviceName: input.serviceName,
        priceCents: input.priceCents,
        depositCents: calcDepositCents(input.priceCents),
        date: input.date,
        timeSlot: input.timeSlot,
        status: "PENDING",
        notes: input.notes,
        paymentMethodId: input.paymentMethodId ?? null,
        paymentMethodName: input.paymentMethodName ?? "",
        paymentReference: input.paymentReference ?? "",
        paymentProofUrl: input.paymentProofUrl ?? "",
      };
      await writeArray(BOOKINGS_KEY, [...bookings, record]);
      await appendBookingEvent(record.id, null, "PENDING");
      return record;
    },

    async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
      const bookings = await readArray(BOOKINGS_KEY, seedBookings(), isBooking).then((rows) =>
        rows.map(withPaymentDefaults),
      );
      const current = bookings.find((booking) => booking.id === id);
      if (!current) throw new DataError("Reserva no encontrada");
      const updated: Booking = { ...current, status };
      const next = bookings.map((booking) => (booking.id === id ? updated : booking));
      await writeArray(BOOKINGS_KEY, next);
      await appendBookingEvent(id, current.status, status);
      return updated;
    },

    async listBookingEvents(bookingId: string): Promise<BookingEvent[]> {
      const events = await readArray(BOOKING_EVENTS_KEY, seedBookingEvents(), isBookingEvent);
      return events
        .filter((event) => event.bookingId === bookingId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async listBlocks(input): Promise<AvailabilityBlock[]> {
      const blocks = await readArray(AVAILABILITY_BLOCKS_KEY, seedAvailabilityBlocks(), isAvailabilityBlock);
      if (!input?.date) return blocks;
      return blocks.filter((block) => blockOverlapsDay(block, input.date!));
    },

    async createBlock(input: NewAvailabilityBlockInput): Promise<AvailabilityBlock> {
      const invalid = validateBlockInput({
        startDatetime: input.startDatetime,
        endDatetime: input.endDatetime,
      });
      if (invalid) throw new DataError(invalid);
      const blocks = await readArray(AVAILABILITY_BLOCKS_KEY, seedAvailabilityBlocks(), isAvailabilityBlock);
      const record: AvailabilityBlock = {
        id: newId(),
        startDatetime: input.startDatetime,
        endDatetime: input.endDatetime,
        reason: input.reason?.trim() ?? "",
        isFullDay: input.isFullDay ?? false,
        createdAt: new Date().toISOString(),
      };
      await writeArray(AVAILABILITY_BLOCKS_KEY, [...blocks, record]);
      return record;
    },

    async deleteBlock(id: string): Promise<void> {
      const blocks = await readArray(AVAILABILITY_BLOCKS_KEY, seedAvailabilityBlocks(), isAvailabilityBlock);
      await writeArray(
        AVAILABILITY_BLOCKS_KEY,
        blocks.filter((block) => block.id !== id),
      );
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

    async getSchedule(): Promise<StudioSchedule> {
      const days = await readArray(SCHEDULE_KEY, seedSchedule(), isStudioScheduleDay);
      // Normalize: exactly the seven weekdays in `sun..sat` order; any missing
      // weekday is treated as closed so the engine always has a full view.
      const byWeekday = new Map(days.map((day) => [day.weekday, day]));
      return WEEKDAY_ORDER.map((weekday) => {
        const existing = byWeekday.get(weekday);
        return (
          existing ?? {
            weekday,
            isOpen: false,
            openTime: null,
            closeTime: null,
          }
        );
      });
    },

    async updateSchedule(input: StudioSchedule): Promise<StudioSchedule> {
      // Validate every day up-front so a single failed day rejects the whole
      // batch without writing anything (atomic parity with the DB upsert).
      for (const day of input) {
        const invalid = validateScheduleDayPatch({
          isOpen: day.isOpen,
          openTime: day.openTime,
          closeTime: day.closeTime,
        });
        if (invalid) throw new DataError(invalid);
      }
      // Normalize to exactly seven days in stable order; closed days store null times.
      const byWeekday = new Map(input.map((day) => [day.weekday, day]));
      const full: StudioSchedule = WEEKDAY_ORDER.map((name) => {
        const existing = byWeekday.get(name);
        if (!existing) {
          return { weekday: name, isOpen: false, openTime: null, closeTime: null };
        }
        return {
          weekday: name,
          isOpen: existing.isOpen,
          openTime: existing.isOpen ? existing.openTime : null,
          closeTime: existing.isOpen ? existing.closeTime : null,
        };
      });
      await writeArray(SCHEDULE_KEY, full);
      return full;
    },

    async listTeamMembers(input): Promise<TeamMember[]> {
      const members = await readArray(TEAM_KEY, seedTeamMembers(), isTeamMember);
      return input?.includeInactive ? members : members.filter((member) => member.isActive);
    },

    async createTeamMember(input: NewTeamMemberInput): Promise<TeamMember> {
      validateTeamMember(input);
      const members = await readArray(TEAM_KEY, seedTeamMembers(), isTeamMember);
      const record: TeamMember = {
        id: newId(),
        name: input.name.trim(),
        role: input.role.trim(),
        avatarUrl: input.avatarUrl,
        bio: input.bio,
        instagramHandle: normalizeInstagram(input.instagramHandle),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await writeArray(TEAM_KEY, [...members, record]);
      return record;
    },

    async updateTeamMember(id, patch): Promise<TeamMember> {
      const members = await readArray(TEAM_KEY, seedTeamMembers(), isTeamMember);
      const current = members.find((member) => member.id === id);
      if (!current) throw new DataError("Miembro no encontrado");
      const merged: TeamMember = {
        ...current,
        ...patch,
        name: patch.name !== undefined ? patch.name.trim() : current.name,
        role: patch.role !== undefined ? patch.role.trim() : current.role,
        instagramHandle:
          patch.instagramHandle !== undefined
            ? normalizeInstagram(patch.instagramHandle)
            : current.instagramHandle,
      };
      validateTeamMember({
        name: merged.name,
        role: merged.role,
        avatarUrl: merged.avatarUrl,
        bio: merged.bio,
        instagramHandle: merged.instagramHandle,
      });
      const next = members.map((member) => (member.id === id ? merged : member));
      await writeArray(TEAM_KEY, next);
      return merged;
    },

    async deleteTeamMember(id: string): Promise<void> {
      const members = await readArray(TEAM_KEY, seedTeamMembers(), isTeamMember);
      if (!members.some((member) => member.id === id)) {
        throw new DataError("Miembro no encontrado");
      }
      await writeArray(
        TEAM_KEY,
        members.filter((member) => member.id !== id),
      );
    },

    // --- Public gallery (feature 016) ---
    async listGalleryItems(input): Promise<GalleryItemRecord[]> {
      const items = await readArray(GALLERY_KEY, seedGalleryItems(), isGalleryItem);
      return input?.includeInactive ? items : items.filter((item) => item.isActive);
    },

    async createGalleryItem(input: NewGalleryItemInput): Promise<GalleryItemRecord> {
      if (input.imageUrl.trim().length === 0) {
        throw new DataError("La imagen es obligatoria");
      }
      const items = await readArray(GALLERY_KEY, seedGalleryItems(), isGalleryItem);
      const record: GalleryItemRecord = {
        id: newId(),
        title: input.title?.trim() ?? "",
        category: input.category?.trim() ?? "",
        imageUrl: input.imageUrl.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await writeArray(GALLERY_KEY, [...items, record]);
      return record;
    },

    async toggleGalleryItemActive(id: string): Promise<GalleryItemRecord> {
      const items = await readArray(GALLERY_KEY, seedGalleryItems(), isGalleryItem);
      let updated: GalleryItemRecord | undefined;
      const next = items.map((item) =>
        item.id === id ? ((updated = { ...item, isActive: !item.isActive }), updated) : item,
      );
      if (!updated) throw new DataError("Imagen no encontrada");
      await writeArray(GALLERY_KEY, next);
      return updated;
    },

    async deleteGalleryItem(id: string): Promise<void> {
      const items = await readArray(GALLERY_KEY, seedGalleryItems(), isGalleryItem);
      if (!items.some((item) => item.id === id)) {
        throw new DataError("Imagen no encontrada");
      }
      await writeArray(
        GALLERY_KEY,
        items.filter((item) => item.id !== id),
      );
    },

    // --- Payment methods (feature 018) ---
    async listPaymentMethods(input): Promise<PaymentMethod[]> {
      const methods = await readArray(PAYMENT_METHODS_KEY, seedPaymentMethods(), isPaymentMethod);
      return input?.includeInactive ? methods : methods.filter((method) => method.isActive);
    },

    async createPaymentMethod(input: NewPaymentMethodInput): Promise<PaymentMethod> {
      validatePaymentMethodInput({
        type: input.type,
        title: input.title,
        details: input.details,
      });
      const methods = await readArray(PAYMENT_METHODS_KEY, seedPaymentMethods(), isPaymentMethod);
      const record: PaymentMethod = {
        id: newId(),
        type: input.type,
        title: input.title.trim(),
        details: { ...input.details },
        instructions: input.instructions?.trim() ?? "",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await writeArray(PAYMENT_METHODS_KEY, [...methods, record]);
      return record;
    },

    async updatePaymentMethod(id, patch): Promise<PaymentMethod> {
      const methods = await readArray(PAYMENT_METHODS_KEY, seedPaymentMethods(), isPaymentMethod);
      const current = methods.find((method) => method.id === id);
      if (!current) throw new DataError("Método de pago no encontrado");
      const merged: PaymentMethod = {
        ...current,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : current.title,
        details: patch.details !== undefined ? { ...patch.details } : current.details,
        instructions:
          patch.instructions !== undefined ? patch.instructions.trim() : current.instructions,
      };
      validatePaymentMethodInput({
        type: merged.type,
        title: merged.title,
        details: merged.details,
      });
      const next = methods.map((method) => (method.id === id ? merged : method));
      await writeArray(PAYMENT_METHODS_KEY, next);
      return merged;
    },

    async togglePaymentMethodActive(id: string): Promise<PaymentMethod> {
      const methods = await readArray(PAYMENT_METHODS_KEY, seedPaymentMethods(), isPaymentMethod);
      let updated: PaymentMethod | undefined;
      const next = methods.map((method) =>
        method.id === id ? ((updated = { ...method, isActive: !method.isActive }), updated) : method,
      );
      if (!updated) throw new DataError("Método de pago no encontrado");
      await writeArray(PAYMENT_METHODS_KEY, next);
      return updated;
    },

    async deletePaymentMethod(id: string): Promise<void> {
      const methods = await readArray(PAYMENT_METHODS_KEY, seedPaymentMethods(), isPaymentMethod);
      if (!methods.some((method) => method.id === id)) {
        throw new DataError("Método de pago no encontrado");
      }
      await writeArray(
        PAYMENT_METHODS_KEY,
        methods.filter((method) => method.id !== id),
      );
    },
  };
}