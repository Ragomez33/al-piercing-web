/**
 * WhatsApp / phone normalization (shared).
 *
 * `wa.me` (and the WhatsApp app) require the international format WITHOUT a
 * leading `+` and WITHOUT spaces, dashes or parentheses (e.g. `584248610492`).
 * Clients commonly type `+58 424-8610492` or omit the country code entirely
 * (`4248610492`), so we normalize BEFORE building any link.
 *
 * When the number omits the country code, the configured default
 * (`WHATSAPP_COUNTRY_CODE`, Venezuela `58`) is prepended so the resulting link is
 * actually reachable — and already-stored numbers are fixed retroactively.
 *
 * Pure functions: no side effects, safe in SSR and client.
 */
import { WHATSAPP_COUNTRY_CODE } from "../config";

/**
 * Digits-only international form:
 * - strips `+`, spaces, dashes, parentheses and a leading `00`;
 * - if it does not already start with the default country code and looks like a
 *   national number (<= 10 digits), prepends the code (dropping a leading trunk `0`).
 *
 * Foreign numbers that already carry their own country code (e.g. `1 305…`) are
 * left untouched.
 */
export function normalizeWhatsAppNumber(
  value: string,
  defaultCountryCode: string = WHATSAPP_COUNTRY_CODE,
): string {
  let digits = value.replace(/\D/g, "");
  // `00` is an alternative international prefix to `+`; drop it.
  if (digits.startsWith("00")) digits = digits.slice(2);

  const cc = defaultCountryCode.replace(/\D/g, "");
  if (cc.length > 0 && digits.length > 0 && !digits.startsWith(cc)) {
    // National trunk `0` (Venezuela: `0414…` → `414…`).
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length <= 10) digits = `${cc}${digits}`;
  }
  return digits;
}

/**
 * True when the value is a plausible international WhatsApp number once
 * normalized. E.164 allows up to 15 digits; we require at least 8 (country code
 * + subscriber number) to avoid trivially short inputs.
 */
export function isValidWhatsAppNumber(
  value: string,
  defaultCountryCode: string = WHATSAPP_COUNTRY_CODE,
): boolean {
  const digits = normalizeWhatsAppNumber(value, defaultCountryCode);
  return digits.length >= 8 && digits.length <= 15;
}

/** Human-readable hint reused by forms so the expected format is always explained. */
export const WHATSAPP_FORMAT_HINT =
  "Solo números, sin «+», espacios ni guiones. El código +58 se agrega automáticamente. Ej: 4248610492";
