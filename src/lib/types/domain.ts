/**
 * Shared domain types and the unified data-store contract for the hybrid
 * data layer (demo localStorage adapter vs production Supabase adapter).
 * Integer cents end-to-end (constitution Principle IV); no `any`.
 */
import type { PiercingService } from "../data/services";
import type { ProductCategory } from "./content";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type DataMode = "demo" | "production";

export interface Booking {
  id: string;
  createdAt: string; // ISO
  clientName: string;
  clientWhatsapp: string;
  serviceId: string;
  serviceName: string;
  priceCents: number; // integer cents, ≥ 0
  depositCents: number; // Math.round(priceCents / 2)
  date: string; // local ISO yyyy-mm-dd
  timeSlot: string; // HH:mm
  status: BookingStatus;
  notes?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: ProductCategory;
  priceCents: number; // integer cents, ≥ 0
  stock: number; // ≥ 0
  image: string;
  published: boolean; // false → hidden from public catalog
}

export interface NewBookingInput {
  clientName: string;
  clientWhatsapp: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  date: string;
  timeSlot: string;
  notes?: string;
}

export interface NewProductInput {
  name: string;
  category: ProductCategory;
  priceCents: number;
  stock: number;
  image: string;
}

/** Typed application error thrown by the data layer (never raw/unexpected values). */
export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

/** The ONLY data-access surface components are allowed to use. */
export interface DataStore {
  readonly mode: DataMode;
  listServices(): Promise<PiercingService[]>;
  listProducts(input: { includeUnpublished: boolean }): Promise<ProductRecord[]>;
  createProduct(input: NewProductInput): Promise<ProductRecord>;
  updateProduct(
    id: string,
    patch: Partial<Pick<ProductRecord, "stock" | "published">>,
  ): Promise<ProductRecord>;
  listBookings(input?: { date?: string }): Promise<Booking[]>;
  createBooking(input: NewBookingInput): Promise<Booking>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>;
  getBookedSlots(date: string): Promise<string[]>;
}