# Contract: Payment Data Layer

**Feature**: `018-payment-methods-deposit` | Covers `src/lib/types/domain.ts`, `src/types/supabase.ts`,
`supabase/migrations/0009_payments_and_booking_proof.sql`, `src/lib/data/{payment-methods,store,realtime}.ts`
and both adapters.

## 1. Entities

`src/lib/types/domain.ts`:

```ts
type PaymentMethodType = "pago_movil" | "binance" | "zelle" | "transfer" | "cash";
type PaymentMethodDetails = Record<string, string>;

interface PaymentMethod {
  id: string;                       // uuid, data-source generated
  type: PaymentMethodType;
  title: string;                    // REQUIRED, non-empty
  details: PaymentMethodDetails;    // whitelisted keys per type (utils/payments.ts)
  instructions: string;             // optional, defaults ""
  isActive: boolean;                // public visibility
  createdAt: string;                // ISO, generated
}

interface NewPaymentMethodInput {
  type: PaymentMethodType;
  title: string;
  details: PaymentMethodDetails;
  instructions?: string;
}

interface BookingEvent {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null; // null for the creation event
  toStatus: BookingStatus;
  createdAt: string;
}

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "COMPLETED" | "CANCELLED";

// Booking gains:
//   paymentMethodId: string | null
//   paymentMethodName: string
//   paymentReference: string
//   paymentProofUrl: string
//   clientEmail?: string
```

## 2. DataStore operations

```ts
listPaymentMethods(input?: { includeInactive?: boolean }): Promise<PaymentMethod[]>;
createPaymentMethod(input: NewPaymentMethodInput): Promise<PaymentMethod>;
updatePaymentMethod(id: string, patch: Partial<NewPaymentMethodInput>): Promise<PaymentMethod>;
togglePaymentMethodActive(id: string): Promise<PaymentMethod>;
deletePaymentMethod(id: string): Promise<void>;
listBookingEvents(bookingId: string): Promise<BookingEvent[]>;

// extended:
createBooking(input: NewBookingInput): Promise<Booking>;        // logs NULL→PENDING
updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>; // logs from→to
```

- `listPaymentMethods()` (no options) returns **active only**; admin passes `{ includeInactive: true }`.
- Validation failures throw `DataError` (title empty / missing required type field) and persist nothing.
- Unknown id → `DataError("Método de pago no encontrado")`.
- `deletePaymentMethod` never touches existing bookings (their snapshot fields remain).
- `listBookingEvents` returns ascending by `createdAt`; writes are append-only.
- `listFallbackPaymentMethods()` is exported from `store.ts` (seeded from `PAYMENT_METHOD_SEED`).

## 3. Migration `supabase/migrations/0009_payments_and_booking_proof.sql`

- `public.payment_methods` (`id`, `created_at`, `type` check, `title`, `details jsonb default '{}'`,
  `instructions default ''`, `is_active default true`).
- `bookings` new columns: `payment_method_id uuid` (FK → `payment_methods(id)` `ON DELETE SET NULL`),
  `payment_method_name text not null default ''`, `payment_reference text not null default ''`,
  `payment_proof_url text not null default ''`, `deposit_amount numeric(10,2) generated always as
  (deposit_cents::numeric / 100) stored`.
- Widened status check: `('PENDING','CONFIRMED','REJECTED','COMPLETED','CANCELLED')`.
- Recreated partial unique index:
  `where status not in ('CANCELLED','REJECTED')`.
- `public.booking_events` (`id`, `booking_id` FK `ON DELETE CASCADE`, `from_status text`,
  `to_status text not null`, `created_at`).
- RLS: `payment_methods select public` (`using (is_active = true)`) + all ops `to authenticated`;
  `booking_events insert public` + `select authenticated` (append-only, no update/delete).
- Seed: starter methods (mobile payment, Binance) from the `config.ts` values, `on conflict do nothing`.

## 4. Supabase client types

`src/types/supabase.ts` gains `payment_methods` and `booking_events` blocks (snake_case Row/Insert/Update,
`Relationships`) and the new `bookings` columns; `status` stays `string`.

## 5. Adapters

- **Supabase** (`adapters/supabase.ts`): `toPaymentMethod(row)` maps `is_active→isActive`,
  `created_at→createdAt`; `toBookingEvent(row)`; `toBooking` maps the four new payment columns. The
  adapter inserts a `booking_events` row inside `createBooking` (`null→PENDING`) and inside
  `updateBookingStatus` (`from→to`). Query `eq("is_active", true)` when `!includeInactive`.
- **Local** (`adapters/local.ts`): keys `alpi:paymentmethods:v1` and `alpi:bookingevents:v1`, guards
  `isPaymentMethod`/`isBookingEvent`, seed from `PAYMENT_METHOD_SEED`; identical CRUD/validation semantics
  and identical automatic event logging; `isBooking` guard updated for the new statuses + payment fields.

## 6. Realtime

- `DataResource` in `realtime.ts` gains `"paymentMethods"`.
- `store.ts` publishes `publishDataChange("paymentMethods")` after successful method mutations and exports
  `listFallbackPaymentMethods()`.
- Supabase channel adds `.on("postgres_changes", { … table: "payment_methods" }, notify("paymentMethods"))`.

## 7. Acceptance mapping

FR-001…FR-007, FR-011, FR-013, FR-024, FR-027 → this contract; verified by `quickstart.md` scenarios 1, 2,
5, 7.
