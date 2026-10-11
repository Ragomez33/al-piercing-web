/**
 * Business-hours helpers (features 015/018).
 * Pure functions that compute the studio's open/closed status and the NEXT opening
 * from a weekly schedule. "Now" is inherently client-side, so the caller passes a
 * Date. The data-aware resolver that also considers range/full-day blocks lives in
 * `src/lib/services/availability.ts` (`getStudioOpenStatus`); these helpers keep
 * the label format and next-opening math in one place (pure, unit-testable).
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
  /**
   * Human label per the display rules (feature 018):
   * open   → "Abierto • Cierra a las HH:MM";
   * closed → "Cerrado • Abre [hoy | mañana | el lunes | el 17/10] a las HH:MM".
   */
  label: string;
  /** Next transition `HH:mm` (closing when open; opening when closed), or "" when none. */
  nextChange: string;
  /** Next opening instant when closed (else undefined). */
  nextOpen?: Date;
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

function dateWithMinutes(base: Date, minutes: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

/**
 * Highest-precision next-opening label (feature 018):
 * "hoy" (same calendar day) · "mañana" · "el lunes" (≤6 days out) · "el 17/10".
 */
export function formatNextOpening(next: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const opened = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  const diffDays = Math.round((opened.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "mañana";
  if (diffDays <= 6) return `el ${next.toLocaleDateString("es", { weekday: "long" })}`;
  return `el ${next.toLocaleDateString("es", { day: "numeric", month: "numeric" })}`;
}

/**
 * Next opening instant strictly after `now`, scanning the plain weekly schedule
 * (no blocks). Returns `null` when the schedule has no open day ahead (a closed
 * studio forever in the roster).
 */
function nextOpeningFromSchedule(hours: StructuredHours, now: Date): Date | null {
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const name = WEEKDAYS[day.getDay()];
    const dayHours = hours[name];
    if (!dayHours) continue;
    const open = parseTime(dayHours.open);
    if (open === null) continue;
    const candidate = dateWithMinutes(day, open);
    if (candidate.getTime() <= now.getTime()) continue;
    return candidate;
  }
  return null;
}

/**
 * Resolves the live open state for `now` from a weekly schedule ONLY (blocks are
 * handled by the data-aware `getStudioOpenStatus` in the availability service).
 * Invalid or missing days are treated as closed; invalid times are ignored.
 */
export function getOpenStatus(hours: StructuredHours, now: Date): OpenStatus {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = WEEKDAYS[now.getDay()];
  const todayHours = hours[today];

  if (todayHours) {
    const open = parseTime(todayHours.open);
    const close = parseTime(todayHours.close);
    if (open !== null && close !== null && close > open && nowMinutes >= open && nowMinutes < close) {
      return {
        open: true,
        label: `Abierto • Cierra a las ${formatMinutes(close)}`,
        nextChange: formatMinutes(close),
      };
    }
  }

  const next = nextOpeningFromSchedule(hours, now);
  if (next) {
    const nextMinutes = next.getHours() * 60 + next.getMinutes();
    return {
      open: false,
      label: `Cerrado • Abre ${formatNextOpening(next, now)} a las ${formatMinutes(nextMinutes)}`,
      nextChange: formatMinutes(nextMinutes),
      nextOpen: next,
    };
  }

  return { open: false, label: "Cerrado", nextChange: "" };
}