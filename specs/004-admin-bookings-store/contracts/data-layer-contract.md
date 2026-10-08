# Data Layer Contract: Admin Dashboard, Bookings & Hybrid Data Layer

**Feature**: [spec.md](./spec.md) · **Date**: 2026-10-07 · **Phase**: 1 (Design & Contracts)
Backed by [`data-model.md`](../data-model.md) and [`research.md`](../research.md).

## 1. Domain Types

```ts
// src/lib/types/domain.ts — strict TypeScript, integer cents (constitution PIII/PIV)
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type DataMode = "demo" | "production";

export interface Booking {
  id: string;
  createdAt: string;          // ISO
  clientName: string;
  clientWhatsapp: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;         // integer cents, ≥ 0
  depositCents: number;       // Math.round(priceCents / 2)
  date: string;               // local ISO yyyy-mm-dd
  timeSlot: string;           // HH:mm
  status: BookingStatus;
  notes?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: ProductCategory;  // reused from types/content.ts
  priceCents: number;         // integer cents, ≥ 0
  stock: number;              // ≥ 0
  image: string;
  published: boolean;         // false → hidden from public catalog
}
```

## 2. DataStore Facade

```ts
// src/lib/data/store.ts — the ONLY data access point for components
export interface DataStore {
  readonly mode: DataMode;

  listServices(): Promise<PiercingService[]>;
  listProducts(input: { includeUnpublished: boolean }): Promise<ProductRecord[]>;
  createProduct(input: NewProductInput): Promise<ProductRecord>;
  updateProduct(id: string, patch: Partial<Pick<ProductRecord, "stock" | "published">>): Promise<ProductRecord>;

  listBookings(input: { date?: string }): Promise<Booking[]>;
  createBooking(input: NewBookingInput): Promise<Booking>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>;
  getBookedSlots(date: string): Promise<string[]>;
}

export const dataStore: DataStore; // singleton, mode resolved at module init
```

## 3. Adapter Contract

### Demo adapter (`src/lib/data/adapters/local.ts`)
- Keys: `alpi:bookings:v1`, `alpi:products:v1`.
- First read seeds from `src/lib/data/services.ts` / `src/lib/types/content.ts` and writes the seed.
- Writes replace the full array; reads parse + narrow through validators.

### Production adapter (`src/lib/data/adapters/supabase.ts`)
- Uses anon-key client from `import.meta.env.PUBLIC_SUPABASE_URL` + `import.meta.env.PUBLIC_SUPABASE_ANON_KEY`.
- Tables (mirror of `supabase/migrations/0001_init.sql`):
  - `bookings(id, created_at, client_name, client_whatsapp, service_id, service_name,
    price_cents, deposit_cents, date, time_slot, status, notes)`.
  - `products(id, name, category, price_cents, stock, image, published)`.
- Row ↔ domain mapping at the boundary; failures become typed `DataError`.

## 4. Configuration Contract

```ts
// src/lib/config.ts (env-overridable, safe defaults)
export const WHATSAPP_PHONE = import.meta.env.PUBLIC_WHATSAPP_PHONE ?? "5215500000000";
export const ADMIN_PIN = import.meta.env.PUBLIC_ADMIN_PIN ?? "1234";
export const PAYMENT_PAGO_MOVIL = { label: "Pago Móvil", ref: import.meta.env.PUBLIC_PAGO_MOVIL_REF ?? "placeholder" };
export const PAYMENT_BINANCE_PAY = { label: "Binance Pay", ref: import.meta.env.PUBLIC_BINANCE_PAY_ID ?? "placeholder" };
```

## 5. Validation / Narrowing Rules

- Supabase rows and `localStorage` payloads MUST pass `isBooking`/`isProductRecord` guards before use;
  malformed demo entries are dropped, never trusted.
- A slot is busy iff a booking exists for `date + timeSlot` with `status ∈ {PENDING, CONFIRMED}`.
- Deposit is always recomputed as `Math.round(priceCents / 2)` at creation; never trusted from input.