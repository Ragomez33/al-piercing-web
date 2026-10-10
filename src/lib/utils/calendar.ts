/**
 * Calendar math & helpers for the admin calendar (features 006 & 012).
 * Framework-agnostic so it stays unit-testable: month-grid geometry, per-day
 * status summaries and the slot-exclusivity helpers reused by reschedule/block
 * validation.
 */
import { localISODate } from "./dates";

export const CALENDAR_START_MIN = 9 * 60; // 09:00
export const CALENDAR_END_MIN = 19 * 60 + 30; // 19:30 (last bookable slot)
export const ROW_MINUTES = 30;

/** A single cell of the monthly 6×7 grid (feature 012, MON-01). */
export interface MonthDayCell {
  date: string; // local ISO yyyy-mm-dd
  dayNumber: number; // 1–31
  inMonth: boolean; // false for leading/trailing cells
  isToday: boolean;
}

/** Per-day appointment counts shown as badges/dots (feature 012, MON-02). */
export interface DaySummary {
  total: number; // non-cancelled appointments
  pending: number;
  confirmed: number;
  cancelled: number;
}

export interface Occupancy {
  time: string; // HH:mm
  durationMinutes: number;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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

/** First day (00:00) of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Adds (or subtracts) whole months, keeping the day-of-month (clamped). */
export function addMonths(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/** Localized month heading, e.g. "octubre 2026". */
export function monthLabel(date: Date): string {
  return date.toLocaleDateString("es", { month: "long", year: "numeric" });
}

/**
 * The monthly 6×7 grid for `monthStart`: exactly 42 Monday-start cells
 * covering the month plus the leading/trailing days of the adjacent months.
 */
export function monthGrid(monthStart: Date): MonthDayCell[] {
  const first = startOfMonth(monthStart);
  const gridStart = startOfWeek(first);
  const month = first.getMonth();
  const today = localISODate(new Date());
  const cells: MonthDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const date = localISODate(d);
    cells.push({
      date,
      dayNumber: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: date === today,
    });
  }
  return cells;
}

/**
 * Appointment counts for one day. `total` is the non-cancelled count shown as
 * the day badge; `pending`/`confirmed`/`cancelled` drive the status dots.
 */
export function dayStatusSummary(
  bookings: { date: string; status: string }[],
  date: string,
): DaySummary {
  const summary: DaySummary = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  for (const booking of bookings) {
    if (booking.date !== date) continue;
    if (booking.status === "PENDING") summary.pending += 1;
    else if (booking.status === "CONFIRMED") summary.confirmed += 1;
    else if (booking.status === "CANCELLED") summary.cancelled += 1;
    if (booking.status !== "CANCELLED") summary.total += 1;
  }
  return summary;
}

/** All start times in the calendar window, one per row. */
export function calendarRows(): string[] {
  const rows: string[] = [];
  for (let m = CALENDAR_START_MIN; m <= CALENDAR_END_MIN; m += ROW_MINUTES) {
    rows.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return rows;
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