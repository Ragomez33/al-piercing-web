/**
 * Business-hours helpers (feature 015).
 * Pure functions that turn a weekly schedule into a live open/closed label for the
 * landing sidebar. "Now" is inherently client-side, so the caller passes a Date.
 */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  /** Opening time, `HH:mm`. */
  open: string;
  /** Closing time, `HH:mm`. */
  close: string;
}

/** A weekly schedule; `null` means the studio is closed that day. */
export type StructuredHours = Record<Weekday, DayHours | null>;

export interface OpenStatus {
  open: boolean;
  /** Human label, e.g. `"Abierto • Cierra a las 20:00"` or `"Cerrado • Abre a las 11:00"`. */
  label: string;
  /** Next transition time `HH:mm`, or `""` when there is no schedule. */
  nextChange: string;
}

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Default schedule mirrors `Mo-Sa 11:00-20:00`; Sunday is closed. */
export const DEFAULT_BUSINESS_HOURS: StructuredHours = {
  mon: { open: "11:00", close: "20:00" },
  tue: { open: "11:00", close: "20:00" },
  wed: { open: "11:00", close: "20:00" },
  thu: { open: "11:00", close: "20:00" },
  fri: { open: "11:00", close: "20:00" },
  sat: { open: "11:00", close: "20:00" },
  sun: null,
};

/** Parses `HH:mm` (24h) into minutes since midnight, or `null` when invalid. */
export function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Resolves the live open state for `now`. Invalid or missing days are treated as closed;
 * invalid times are ignored. Never throws.
 */
export function getOpenStatus(hours: StructuredHours, now: Date): OpenStatus {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = WEEKDAYS[now.getDay()] ?? "sun";
  const todayHours = hours[today];

  if (todayHours) {
    const open = parseTime(todayHours.open);
    const close = parseTime(todayHours.close);
    if (open !== null && close !== null && close > open && nowMinutes >= open && nowMinutes < close) {
      return { open: true, label: `Abierto • Cierra a las ${formatMinutes(close)}`, nextChange: formatMinutes(close) };
    }
    // Closed now, opens later today.
    if (open !== null && nowMinutes < open) {
      return { open: false, label: `Cerrado • Abre a las ${formatMinutes(open)}`, nextChange: formatMinutes(open) };
    }
  }

  // Find the next opening time over the coming week.
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = WEEKDAYS[(now.getDay() + offset) % 7] ?? "sun";
    const dayHours = hours[day];
    if (!dayHours) continue;
    const open = parseTime(dayHours.open);
    if (open !== null) {
      return { open: false, label: `Cerrado • Abre a las ${formatMinutes(open)}`, nextChange: formatMinutes(open) };
    }
  }

  return { open: false, label: "Cerrado", nextChange: "" };
}
