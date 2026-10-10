/**
 * SEO resolution helpers (feature 014).
 *
 * Single source for: the absolute site URL (from the Astro `site` config, fed by the `SITE`
 * environment variable), social/metadata defaults derived from `STUDIO_PROFILE`, and the
 * `LocalBusiness` structured-data object emitted by `BaseLayout`.
 */
import {
  BRAND_LOGO,
  BUSINESS_ADDRESS,
  BUSINESS_GEO,
  BUSINESS_OPENING_HOURS,
  BUSINESS_PRICE_RANGE,
  DEFAULT_OG_IMAGE,
  INSTAGRAM_URL,
  WHATSAPP_PHONE,
} from "./config";
import { STUDIO_PROFILE } from "./types/content";

const FALLBACK_SITE = "https://alpiercing.com";

function configuredSite(): string {
  const value = import.meta.env.SITE;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : FALLBACK_SITE;
}

/** Absolute site origin without a trailing slash (e.g. `https://alpiercing.com`). */
export const SITE_URL: string = configuredSite().replace(/\/+$/, "");

/** Resolves a site-relative path to an absolute URL. */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  try {
    return new URL(normalized, `${SITE_URL}/`).href;
  } catch {
    return `${SITE_URL}${normalized}`;
  }
}

/** Studio-wide default document title. */
export const DEFAULT_TITLE = `${STUDIO_PROFILE.brand} — ${STUDIO_PROFILE.tagline}`;

/** Studio-wide default meta description. */
export const DEFAULT_DESCRIPTION: string = STUDIO_PROFILE.bio;

export function resolveTitle(title?: string): string {
  return title && title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;
}

export function resolveDescription(description?: string): string {
  return description && description.trim().length > 0 ? description.trim() : DEFAULT_DESCRIPTION;
}

/** Resolves a preview image to an absolute URL (falls back to the default studio image). */
export function resolveImage(image?: string): string {
  const raw = image && image.trim().length > 0 ? image.trim() : DEFAULT_OG_IMAGE;
  return absoluteUrl(raw);
}

/**
 * Builds the `LocalBusiness` (specialized as BeautySalon/TattooShop) JSON-LD object.
 * `geo` is included only when coordinates are configured — never as an empty value.
 */
export function buildLocalBusinessJsonLd(): Record<string, unknown> {
  const address: Record<string, unknown> = { "@type": "PostalAddress" };
  if (BUSINESS_ADDRESS.streetAddress) address.streetAddress = BUSINESS_ADDRESS.streetAddress;
  if (BUSINESS_ADDRESS.addressLocality) address.addressLocality = BUSINESS_ADDRESS.addressLocality;
  if (BUSINESS_ADDRESS.addressRegion) address.addressRegion = BUSINESS_ADDRESS.addressRegion;
  if (BUSINESS_ADDRESS.postalCode) address.postalCode = BUSINESS_ADDRESS.postalCode;
  address.addressCountry = BUSINESS_ADDRESS.addressCountry || "MX";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "BeautySalon", "TattooShop"],
    name: STUDIO_PROFILE.brand,
    url: absoluteUrl("/"),
    logo: absoluteUrl(BRAND_LOGO),
    image: resolveImage(),
    description: DEFAULT_DESCRIPTION,
    telephone: WHATSAPP_PHONE,
    priceRange: BUSINESS_PRICE_RANGE,
    address,
    sameAs: [INSTAGRAM_URL],
    openingHours: BUSINESS_OPENING_HOURS,
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/booking"),
        actionPlatform: "https://schema.org/DesktopWebPlatform",
      },
    },
  };

  if (BUSINESS_GEO) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_GEO.latitude,
      longitude: BUSINESS_GEO.longitude,
    };
  }

  return jsonLd;
}
