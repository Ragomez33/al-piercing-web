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

// --- SEO / structured data (feature 014) ---------------------------------

/** Default social preview / structured-data image (absolute-ized at render time). */
export const DEFAULT_OG_IMAGE: string = "/og-image.jpg";

/** Public Instagram profile (JSON-LD `sameAs`; mirrors the footer link). */
export const INSTAGRAM_URL: string = "https://instagram.com/alpiercing";

/** Structured postal address used by the `LocalBusiness` JSON-LD. */
export interface BusinessAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export const BUSINESS_ADDRESS: BusinessAddress = {
  streetAddress: envString(import.meta.env.PUBLIC_BUSINESS_STREET, ""),
  addressLocality: envString(import.meta.env.PUBLIC_BUSINESS_CITY, "Ciudad de México"),
  addressRegion: envString(import.meta.env.PUBLIC_BUSINESS_REGION, "CDMX"),
  postalCode: envString(import.meta.env.PUBLIC_BUSINESS_ZIP, ""),
  addressCountry: envString(import.meta.env.PUBLIC_BUSINESS_COUNTRY, "MX"),
};

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

function envNumber(value: unknown): number | null {
  const parsed = typeof value === "string" && value.trim().length > 0 ? Number(value.trim()) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Optional coordinates; `null` (omitted from JSON-LD) unless both are configured. */
export const BUSINESS_GEO: GeoCoordinates | null = (() => {
  const latitude = envNumber(import.meta.env.PUBLIC_BUSINESS_LAT);
  const longitude = envNumber(import.meta.env.PUBLIC_BUSINESS_LNG);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
})();

/** Business hours in schema.org format (e.g. `Mo-Sa 11:00-20:00`). */
export const BUSINESS_OPENING_HOURS: string = "Mo-Sa 11:00-20:00";

/** Price level indicator for the local business (`$$`). */
export const BUSINESS_PRICE_RANGE: string = "$$";