/**
 * Pure availability engine (feature 017).
 *
 * Single source of truth for the intersection of three inputs:
 *   1. the studio's weekly schedule (working window per weekday),
 *   2. existing non-cancelled appointments (occupied intervals),
 *   3. range/full-day availability blocks.
 *
 * Framework-agnostic (mirrors `calendar.ts`) so it stays unit-testable. Components
 * never call this module directly — they use the availability domain service
 * (`src/lib/services/availability.ts`) or `dataStore` (constitution: Data Access).
 *
 * Time model (research R5): dates travel as local `yyyy-mm-dd` and times as `HH:mm`;
 * ISO instants (`AvailabilityBlock.startDatetime/endDatetime`) are compared as `Date`s
 * built from those local values, matching how `localISODate` works elsewhere.
 */
import type {
  AvailabilityBlock,
  BookingStatus,
  UpdateScheduleDayInput,
} from "../types/domain";

export interface SlotInterval {
  start: Date;
  end: Date;
}

export type ActiveBookingLike = {
  date: string;
  timeSlot: string;
  status: BookingStatus;
  durationMinutes: number;
};

const DEFAULT_STEP_MIN = 30;

/** Parses `HH:mm` (24h) into minutes since midnight, or `null` when invalid. */
export function parseTimeMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Formats minutes since midnight as `HH:mm`. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** Local midnight (start of day) for a `yyyy-mm-dd` string. */
export function localDayStart(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y || 0, Math.max(0, (m || 1) - 1), d || 1, 0, 0, 0, 0);
}

/** Exclusive end of a local day (next midnight) for a `yyyy-mm-dd` string. */
export function localDayEnd(date: string): Date {
  const start = localDayStart(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** Local `Date` built from a local date + `HH:mm`, or `null` when invalid. */
export function localDateTime(date: string, time: string): Date | null {
  const minutes = parseTimeMinutes(time);
  if (minutes === null) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!Number.isInteger(y) || y <= 0 || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

/** The offered/occupied slot interval `[slot, slot+duration)` in local time. */
export function resolveSlotInterval(date: string, slot: string, durationMinutes: number): SlotInterval {
  const start = localDateTime(date, slot);
  if (!start || Number.isNaN(start.getTime())) {
    return { start: new Date(NaN), end: new Date(NaN) };
  }
  return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
}

/**
 * Local ISO instant for `date @ time` (used by the admin block form). Returns
 * `null` when the input is invalid.
 */
export function slotStartToISO(date: string, time: string): string | null {
  const d = localDateTime(date, time);
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

/**
 * Half-open ISO interval for a full-day range: `[startDate 00:00, endDate+1 00:00)`.
 * Returns `null` when either date is invalid. Equal dates block exactly one day.
 */
export function fullDayRangeToISO(
  startDate: string,
  endDate: string,
): { startDatetime: string; endDatetime: string } | null {
  const start = localDayStart(startDate);
  const endBase = localDayStart(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endBase.getTime())) return null;
  const end = new Date(endBase.getTime() + 24 * 60 * 60 * 1000);
  return { startDatetime: start.toISOString(), endDatetime: end.toISOString() };
}

/** Local `yyyy-mm-dd` of an ISO instant (display helpers for ranges). */
export function localDateFromISO(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local `HH:mm` of an ISO instant (display helpers for ranges). */
export function localTimeFromISO(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** True when a block's interval overlaps any part of a local day (full-day covers all day). */
export function blockOverlapsDay(
  block: { startDatetime: string; endDatetime: string },
  date: string,
): boolean {
  const start = new Date(block.startDatetime);
  const end = new Date(block.endDatetime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const dayStart = localDayStart(date);
  const dayEnd = localDayEnd(date);
  return start.getTime() < dayEnd.getTime() && dayStart.getTime() < end.getTime();
}

/** True when a block overlaps the given interval at all (half-open `[start, end)`). */
export function blockOverlapsInterval(
  block: { startDatetime: string; endDatetime: string },
  start: Date,
  end: Date,
): boolean {
  const blockStart = new Date(block.startDatetime);
  const blockEnd = new Date(block.endDatetime);
  if (Number.isNaN(blockStart.getTime()) || Number.isNaN(blockEnd.getTime())) return false;
  return start.getTime() < blockEnd.getTime() && blockStart.getTime() < end.getTime();
}

/**
 * A slot is free ⇔ (scheduleDay?.isOpen AND openTime ≤ slot AND slot+duration ≤ closeTime)
 * AND no non-cancelled booking interval overlaps [slot, slot+duration)
 * AND no block interval overlaps [slot, slot+duration).
 */
export function isSlotFree(
  date: string,
  slot: string,
  durationMinutes: number,
  scheduleDay: { isOpen: boolean; openTime: string | null; closeTime: string | null } | null,
  bookings: ActiveBookingLike[],
  blocks: AvailabilityBlock[],
): boolean {
  if (!scheduleDay || !scheduleDay.isOpen) return false;
  const open = parseTimeMinutes(scheduleDay.openTime ?? "");
  const close = parseTimeMinutes(scheduleDay.closeTime ?? "");
  if (open === null || close === null || close <= open) return false;
  const slotMin = parseTimeMinutes(slot);
  if (slotMin === null) return false;
  const endMin = slotMin + durationMinutes;
  if (open > slotMin || endMin > close) return false;

  const { start, end } = resolveSlotInterval(date, slot, durationMinutes);
  if (Number.isNaN(start.getTime())) return false;

  const blockedByBooking = bookings.some((booking) => {
    if (booking.status === "CANCELLED") return false;
    const bookingStart = localDateTime(booking.date, booking.timeSlot);
    if (!bookingStart || Number.isNaN(bookingStart.getTime())) return false;
    const bookingEnd = new Date(bookingStart.getTime() + Math.max(0, booking.durationMinutes) * 60_000);
    return start.getTime() < bookingEnd.getTime() && bookingStart.getTime() < end.getTime();
  });
  if (blockedByBooking) return false;

  return !blocks.some((block) => blockOverlapsInterval(block, start, end));
}

/**
 * Ordered `HH:mm` start times that are free, stepped through the working window.
 * Closed/no-schedule days and fully-blocked days return `[]`.
 */
export function buildFreeSlots(
  date: string,
  scheduleDay: { isOpen: boolean; openTime: string | null; closeTime: string | null } | null,
  bookings: ActiveBookingLike[],
  blocks: AvailabilityBlock[],
  options?: { durationMinutes?: number; stepMin?: number },
): string[] {
  if (!scheduleDay || !scheduleDay.isOpen) return [];
  const open = parseTimeMinutes(scheduleDay.openTime ?? "");
  const close = parseTimeMinutes(scheduleDay.closeTime ?? "");
  if (open === null || close === null || close <= open) return [];
  const durationMinutes = options?.durationMinutes ?? 30;
  const stepMin = options?.stepMin ?? DEFAULT_STEP_MIN;

  const slots: string[] = [];
  for (let m = open; m + durationMinutes <= close; m += stepMin) {
    const slot = formatMinutes(m);
    if (isSlotFree(date, slot, durationMinutes, scheduleDay, bookings, blocks)) {
      slots.push(slot);
    }
  }
  return slots;
}

/**
 * Block-form validation used by both adapters (identical error copy).
 * Returns `null` when valid, otherwise the user-facing message.
 */
export function validateBlockInput(input: {
  startDatetime: string;
  endDatetime: string;
}): string | null {
  const start = new Date(input.startDatetime);
  const end = new Date(input.endDatetime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "La fecha y hora del bloqueo son inválidas";
  }
  if (end.getTime() <= start.getTime()) {
    return "El fin debe ser posterior al inicio";
  }
  return null;
}

/**
 * Schedule-day validation used by both adapters (identical error copy).
 * Returns `null` when valid, otherwise the user-facing message.
 */
export function validateScheduleDayPatch(patch: UpdateScheduleDayInput): string | null {
  if (!patch.isOpen) return null;
  if (patch.openTime === null || patch.closeTime === null) {
    return "Completá la hora de apertura y cierre";
  }
  const open = parseTimeMinutes(patch.openTime);
  const close = parseTimeMinutes(patch.closeTime);
  if (open === null || close === null) {
    return "Las horas deben tener el formato HH:mm";
  }
  if (close <= open) {
    return "El cierre debe ser posterior a la apertura";
  }
  return null;
}