/**
 * Calendar math & helpers for the admin calendar (feature 006).
 * Framework-agnostic so it stays unit-testable.
 */
import { localISODate } from "./dates";

export const CALENDAR_START_MIN = 9 * 60; // 09:00
export const CALENDAR_END_MIN = 19 * 60 + 30; // 19:30 (last bookable slot)
export const ROW_MINUTES = 30;
export const ROW_HEIGHT_PX = 40;
export const PX_PER_MINUTE = ROW_HEIGHT_PX / ROW_MINUTES; // 1.333 px/min (80px per hour)

export interface DayCell {
  date: string; // local ISO yyyy-mm-dd
  label: string; // "lun 12/10"
  isToday: boolean;
}

export interface Occupancy {
  time: string; // HH:mm
  durationMinutes: number;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTime(hhmm: string): string {
  return hhmm;
}

/** Monday-start week containing the given date. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function weekDays(start: Date): DayCell[] {
  const today = localISODate(new Date());
  const out: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const date = localISODate(d);
    out.push({
      date,
      label: `${d.toLocaleDateString("es", { weekday: "short" })} ${d.toLocaleDateString("es", {
        day: "2-digit",
        month: "2-digit",
      })}`,
      isToday: date === today,
    });
  }
  return out;
}

/** All start times in the calendar window, one per row. */
export function calendarRows(): string[] {
  const rows: string[] = [];
  for (let m = CALENDAR_START_MIN; m <= CALENDAR_END_MIN; m += ROW_MINUTES) {
    rows.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return rows;
}

/** CSS `top` in px for an appointment/block starting at `time`. */
export function topForTime(time: string): number {
  return (minutesOf(time) - CALENDAR_START_MIN) * PX_PER_MINUTE;
}

/** CSS `height` in px for an appointment/block of `minutes`. */
export function heightForMinutes(minutes: number): number {
  return minutes * PX_PER_MINUTE;
}

/** Snaps a click Y offset (px, relative to a day column) to a row start time. */
export function timeAtOffsetY(offsetY: number): string {
  const index = Math.max(0, Math.min(calendarRows().length - 1, Math.floor(offsetY / ROW_HEIGHT_PX)));
  return calendarRows()[index];
}

/** True when [start, start+duration) overlaps any occupancy interval. */
export function isBusy(occupancies: Occupancy[], start: string, durationMinutes: number): boolean {
  const startMin = minutesOf(start);
  const endMin = startMin + durationMinutes;
  return occupancies.some((o) => {
    const os = minutesOf(o.time);
    const oe = os + o.durationMinutes;
    return startMin < oe && os < endMin;
  });
}

/** Occupancies for a single date from bookings + blocks (excludes an optional booking id). */
export function buildOccupancies(
  bookings: { date: string; timeSlot: string; status: string; id: string; durationMinutes: number }[],
  blocks: { date: string; timeSlot: string; durationMinutes: number }[],
  date: string,
  excludeBookingId?: string,
): Occupancy[] {
  const active = bookings.filter(
    (b) => b.date === date && (b.status === "PENDING" || b.status === "CONFIRMED") && b.id !== excludeBookingId,
  );
  const dayBlocks = blocks.filter((b) => b.date === date);
  return [
    ...active.map((b) => ({ time: b.timeSlot, durationMinutes: b.durationMinutes })),
    ...dayBlocks.map((b) => ({ time: b.timeSlot, durationMinutes: b.durationMinutes })),
  ];
}