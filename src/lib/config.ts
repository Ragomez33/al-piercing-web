/**
 * Runtime configuration (single-store ALPIERCING).
 * Env-overridable via PUBLIC_* variables (inlined by Astro at build time); each value has a
 * documented fallback so the site never breaks in demo mode.
 */
function envString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

/** Destination WhatsApp number for bookings & cart orders (digits only, country code). */
export const WHATSAPP_PHONE: string = envString(import.meta.env.PUBLIC_WHATSAPP_PHONE, "5215500000000");

/** Brand icon/logo asset (public assets served at site root). */
export const BRAND_LOGO: string = "/images/logo.png";

/** Admin route prefix; the public navigation is hidden there (feature 008). */
export const ADMIN_PREFIX: string = "/admin";

export interface PaymentChannel {
  label: string;
  ref: string;
}

/** Pago Móvil details shown on the deposit summary (placeholder refs until configured). */
export const PAYMENT_PAGO_MOVIL: PaymentChannel = {
  label: "Pago Móvil",
  ref: envString(import.meta.env.PUBLIC_PAGO_MOVIL_REF, "0414-000-0000"),
};

/** Binance Pay details shown on the deposit summary (placeholder refs until configured). */
export const PAYMENT_BINANCE_PAY: PaymentChannel = {
  label: "Binance Pay",
  ref: envString(import.meta.env.PUBLIC_BINANCE_PAY_ID, "ALPIERCING-PAY"),
};

/**
 * Browser chrome theme color. Kept as a literal because `<meta name="theme-color">` cannot
 * read CSS custom properties; it mirrors `--bg-app-body` from tokens.css (metadata only).
 */
export const THEME_COLOR = "#111113";