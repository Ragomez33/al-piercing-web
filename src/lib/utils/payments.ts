/**
 * Payment-method descriptors and validation (feature 018).
 *
 * The SAME descriptor drives the admin create/edit form and the client payment
 * step, so banking-field labels and required flags never drift between surfaces.
 * `details` keys are machine keys; labels are the Spanish UI copy.
 */
import { DataError, type PaymentMethodDetails, type PaymentMethodType } from "../types/domain";

export interface PaymentMethodField {
  key: string;
  label: string;
  required: boolean;
  /** Soft input hint (evita teclados/formatos inesperados). */
  placeholder?: string;
}

export interface PaymentMethodTypeInfo {
  id: PaymentMethodType;
  label: string;
  fields: PaymentMethodField[];
}

export const PAYMENT_METHOD_TYPES: PaymentMethodTypeInfo[] = [
  {
    id: "pago_movil",
    label: "Pago Móvil",
    fields: [
      { key: "cedula", label: "Cédula / RIF", required: true, placeholder: "V-00000000" },
      { key: "telefono", label: "Teléfono", required: true, placeholder: "0414-000-0000" },
      { key: "banco", label: "Banco", required: true },
      { key: "titular", label: "Titular", required: false },
    ],
  },
  {
    id: "binance",
    label: "Binance Pay",
    fields: [
      { key: "payId", label: "Pay ID", required: true, placeholder: "ALPIERCING-PAY" },
      { key: "titular", label: "Titular", required: false },
    ],
  },
  {
    id: "zelle",
    label: "Zelle",
    fields: [
      { key: "cuenta", label: "Correo / Cuenta", required: true },
      { key: "titular", label: "Titular", required: true },
    ],
  },
  {
    id: "transfer",
    label: "Transferencia",
    fields: [
      { key: "banco", label: "Banco", required: true },
      { key: "cuenta", label: "Número de cuenta", required: true },
      { key: "titular", label: "Titular", required: true },
    ],
  },
  {
    id: "cash",
    label: "Efectivo",
    fields: [{ key: "sede", label: "Sede / Nota", required: false }],
  },
];

const TYPE_IDS = PAYMENT_METHOD_TYPES.map((info) => info.id);

export function isPaymentMethodType(value: unknown): value is PaymentMethodType {
  return typeof value === "string" && (TYPE_IDS as readonly string[]).includes(value);
}

export function paymentMethodTypeLabel(type: PaymentMethodType): string {
  return PAYMENT_METHOD_TYPES.find((info) => info.id === type)?.label ?? type;
}

export function fieldsForType(type: PaymentMethodType): PaymentMethodField[] {
  return PAYMENT_METHOD_TYPES.find((info) => info.id === type)?.fields ?? [];
}

/** Returns the labels of required fields still empty (for inline form messages). */
export function missingRequiredFields(
  type: PaymentMethodType,
  details: PaymentMethodDetails,
): string[] {
  return fieldsForType(type)
    .filter((field) => field.required && (details[field.key] ?? "").trim().length === 0)
    .map((field) => field.label);
}

/**
 * Validates a payment-method input at the domain boundary. Throws a typed
 * `DataError` (demo parity with the DB checks) and never returns partially.
 */
export function validatePaymentMethodInput(input: {
  type: unknown;
  title: string;
  details: PaymentMethodDetails;
}): void {
  if (!isPaymentMethodType(input.type)) {
    throw new DataError("Tipo de método de pago inválido");
  }
  if (input.title.trim().length === 0) {
    throw new DataError("El título es obligatorio");
  }
  const missing = missingRequiredFields(input.type, input.details);
  if (missing.length > 0) {
    throw new DataError(`Completa los datos del método de pago: ${missing.join(", ")}`);
  }
}
