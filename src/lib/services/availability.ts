/**
 * Availability domain service (feature 017).
 *
 * The ONLY entry point components use to compute the offered slots for a date
 * (constitution: Data Access). It orchestrates `dataStore` reads (schedule,
 * bookings with real service durations, range blocks) and delegates the pure
 * intersection math to `src/lib/utils/availability.ts`. Never touches Supabase
 * directly.
 */
import { DataError, dataStore, listFallbackSchedule } from "../data/store";
import { WEEKDAY_ORDER, type AvailabilityBlock, type StudioSchedule } from "../types/domain";
import { localISODate } from "../utils/dates";
import { formatNextOpening, type OpenStatus } from "../utils/hours";
import {
  blockOverlapsDay,
  buildFreeSlots,
  formatMinutes,
  isSlotFree,
  localDateTime,
  parseTimeMinutes,
  type ActiveBookingLike,
} from "../utils/availability";

export interface DayAvailability {
  date: string; // local yyyy-mm-dd
  /** Free `HH:mm` starts — the intersection of schedule × bookings × blocks. */
  slots: string[];
  /** false when no schedule is configured at all (fail closed, FR-004). */
  hasSchedule: boolean;
  /** Why the day offers no slots, when applicable. */
  closedReason: "closed" | "blocked" | null;
}

function weekdayOf(date: string): (typeof WEEKDAY_ORDER)[number] {
  const [y, m, d] = date.split("-").map(Number);
  const dayIndex = new Date(y || 0, Math.max(0, (m || 1) - 1), d || 1, 0, 0, 0, 0).getDay();
  return WEEKDAY_ORDER[dayIndex] ?? "sun";
}

async function loadSchedule(): Promise<StudioSchedule> {
  try {
    return await dataStore.getSchedule();
  } catch (scheduleError) {
    // Non-blocking fallback to the demo seed (research R8); a total failure
    // still surfaces so callers can keep the last known availability.
    try {
      return await listFallbackSchedule();
    } catch {
      throw scheduleError instanceof DataError
        ? scheduleError
        : new DataError("No se pudo cargar la agenda");
    }
  }
}

async function loadServiceDurations(): Promise<Map<string, number>> {
  try {
    const services = await dataStore.listServices({ includeInactive: true });
    return new Map(services.map((service) => [service.id, service.durationMinutes]));
  } catch {
    return new Map();
  }
}

function toActiveBookings(
  input: {
    id: string;
    date: string;
    timeSlot: string;
    status: string;
    serviceId: string | null;
  }[],
  durations: Map<string, number>,
  excludeBookingId?: string,
): ActiveBookingLike[] {
  return input
    .filter((booking) => booking.status !== "CANCELLED" && booking.id !== excludeBookingId)
    .map((booking) => ({
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status as ActiveBookingLike["status"],
      durationMinutes: durations.get(booking.serviceId ?? "") ?? 30,
    }));
}

/**
 * Computes the free slots for one local date. `durationMinutes` comes from the
 * selected service in the public flow; `excludeBookingId` lets the admin
 * reschedule UI ignore the booking being moved.
 */
export async function getDayAvailability(
  date: string,
  durationMinutes?: number,
  excludeBookingId?: string,
): Promise<DayAvailability> {
  const schedule = await loadSchedule();
  const day = schedule.find((entry) => entry.weekday === weekdayOf(date)) ?? null;

  const [bookings, blocks] = await Promise.all([
    dataStore.listBookings({ date }),
    dataStore.listBlocks({ date }),
  ]);
  const durations = await loadServiceDurations();
  const active = toActiveBookings(bookings, durations, excludeBookingId);

  const dur = durationMinutes && durationMinutes > 0 ? durationMinutes : 30;
  const slots = buildFreeSlots(date, day, active, blocks, { durationMinutes: dur });

  let closedReason: DayAvailability["closedReason"] = null;
  if (slots.length === 0) {
    if (!day || !day.isOpen) {
      closedReason = "closed";
    } else if (blocks.some((block) => block.isFullDay && blockOverlapsDay(block, date))) {
      closedReason = "blocked";
    }
  }

  return { date, slots, hasSchedule: schedule.length > 0, closedReason };
}

/**
 * Strict re-validation used by the booking guard before persisting (FR-014):
 * true only when the slot is still within working hours, not covered by a
 * block, and not already taken by a non-cancelled appointment.
 */
export async function isSlotBookable(
  date: string,
  slot: string,
  durationMinutes: number,
): Promise<boolean> {
  const schedule = await loadSchedule();
  const day = schedule.find((entry) => entry.weekday === weekdayOf(date)) ?? null;

  const [bookings, blocks] = await Promise.all([
    dataStore.listBookings({ date }),
    dataStore.listBlocks({ date }),
  ]);
  const durations = await loadServiceDurations();
  const active = bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .map((booking) => ({
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status as ActiveBookingLike["status"],
      durationMinutes: durations.get(booking.serviceId ?? "") ?? 30,
    }));

  return isSlotFree(date, slot, durationMinutes, day, active, blocks);
}

// ---------------------------------------------------------------------------
// Live open/closed status for the landing badges (feature 018)
// ---------------------------------------------------------------------------

/** True when an instant `t` falls inside a block's `[start, end)` interval. */
function instantInsideBlock(
  block: { startDatetime: string; endDatetime: string },
  instant: number,
): boolean {
  const start = new Date(block.startDatetime).getTime();
  const end = new Date(block.endDatetime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return start <= instant && instant < end;
}

function addDaysFrom(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Next opening instant strictly after `now`, skipping closed days, full-day
 * blocks and range blocks (jumps to each blocking interval's end). Scans up to
 * 14 days ahead; returns `null` when nothing opens within that horizon.
 */
function nextOpeningInstant(
  schedule: StudioSchedule,
  blocks: AvailabilityBlock[],
  now: Date,
): Date | null {
  for (let offset = 0; offset <= 14; offset += 1) {
    const day = addDaysFrom(now, offset);
    const date = localISODate(day);
    const weekday = WEEKDAY_ORDER[day.getDay()] ?? "sun";
    const dayHours = schedule.find((entry) => entry.weekday === weekday);
    if (!dayHours?.isOpen || !dayHours.openTime || !dayHours.closeTime) continue;

    const openInst = localDateTime(date, dayHours.openTime);
    const closeInst = localDateTime(date, dayHours.closeTime);
    if (!openInst || !closeInst) continue;
    const openTs = openInst.getTime();
    const closeTs = closeInst.getTime();
    if (closeTs <= openTs) continue;

    // A full-day block makes the whole day unavailable.
    if (blocks.some((block) => block.isFullDay && blockOverlapsDay(block, date))) continue;

    let candidate = openTs;
    if (candidate <= now.getTime()) {
      // Same day, past/at opening: look from the next minute onwards.
      candidate = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000;
    }

    while (candidate < closeTs) {
      const blocking = blocks.find(
        (block) => !block.isFullDay && instantInsideBlock(block, candidate),
      );
      if (!blocking) return new Date(candidate);
      const blockEnd = new Date(blocking.endDatetime).getTime();
      if (blockEnd > closeTs) break; // day effectively blocked
      candidate = blockEnd;
    }
  }
  return null;
}

/**
 * Resolves the LIVE open/closed status from the saved `studio_schedule` and
 * current `availability_blocks` (feature 018). Reads fall back to the demo seed
 * schedule / an empty block list so the badge never hard-crashes. "Now" is
 * injected for testability.
 *
 * Label rules:
 *  open   → "Abierto • Cierra a las HH:MM";
 *  closed → "Cerrado • Abre [hoy | mañana | el lunes | el 17/10] a las HH:MM",
 *           searching the next available opening in the working calendar.
 */
export async function getStudioOpenStatus(now: Date = new Date()): Promise<OpenStatus> {
  const schedule = await loadSchedule();
  let blocks: AvailabilityBlock[] = [];
  try {
    blocks = await dataStore.listBlocks();
  } catch {
    blocks = [];
  }

  const date = localISODate(now);
  const weekday = WEEKDAY_ORDER[now.getDay()] ?? "sun";
  const day = schedule.find((entry) => entry.weekday === weekday) ?? null;

  const open = parseTimeMinutes(day?.openTime ?? "");
  const close = parseTimeMinutes(day?.closeTime ?? "");

  if (day?.isOpen && open !== null && close !== null && close > open) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const fullDayBlocked = blocks.some((block) => block.isFullDay && blockOverlapsDay(block, date));
    const inRangeBlock = blocks.some((block) => instantInsideBlock(block, now.getTime()));
    if (!fullDayBlocked && !inRangeBlock && nowMinutes >= open && nowMinutes < close) {
      return {
        open: true,
        label: `Abierto • Cierra a las ${formatMinutes(close)}`,
        nextChange: formatMinutes(close),
      };
    }
  }

  const next = nextOpeningInstant(schedule, blocks, now);
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