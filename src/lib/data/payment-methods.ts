/**
 * Demo seed for the managed payment-method catalogue (feature 018).
 *
 * Served by the local adapter when `alpi:paymentmethods:v1` is absent, mirroring
 * `PIERCING_SERVICES` / `TEAM_MEMBERS` / `GALLERY_SEED`. The banking values are the
 * env-overridable placeholders from `config.ts` so a fresh demo is instantly usable.
 */
import type { PaymentMethod } from "../types/domain";
import { PAYMENT_BINANCE_PAY, PAYMENT_PAGO_MOVIL } from "../config";

export const PAYMENT_METHOD_SEED: PaymentMethod[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    type: "pago_movil",
    title: PAYMENT_PAGO_MOVIL.label,
    details: {
      cedula: "V-00000000",
      telefono: PAYMENT_PAGO_MOVIL.ref,
      banco: "Banco de Venezuela",
      titular: "ALPIERCING",
    },
    instructions: "Envía el monto del adelanto y guarda la captura del comprobante.",
    isActive: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    type: "binance",
    title: PAYMENT_BINANCE_PAY.label,
    details: {
      payId: PAYMENT_BINANCE_PAY.ref,
      titular: "ALPIERCING",
    },
    instructions: "Paga el adelanto por Binance Pay y adjunta la captura con el Pay ID.",
    isActive: true,
    createdAt: new Date(0).toISOString(),
  },
];
