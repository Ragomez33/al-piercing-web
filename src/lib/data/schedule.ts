/**
 * Demo seed for the studio's recurring weekly schedule (feature 017).
 * Mirrors the production seed in migration 0008 and DEFAULT_BUSINESS_HOURS in
 * src/lib/utils/hours.ts (Mo–Sa 11:00–20:00, Sun closed). The local adapter seeds
 * `alpi:studioschedule:v1` from this constant when the key is absent.
 */
import type { StudioSchedule } from "../types/domain";

export const DEFAULT_SCHEDULE_SEED: StudioSchedule = [
  { weekday: "sun", isOpen: false, openTime: null, closeTime: null },
  { weekday: "mon", isOpen: true, openTime: "11:00", closeTime: "20:00" },
  { weekday: "tue", isOpen: true, openTime: "11:00", closeTime: "20:00" },
  { weekday: "wed", isOpen: true, openTime: "11:00", closeTime: "20:00" },
  { weekday: "thu", isOpen: true, openTime: "11:00", closeTime: "20:00" },
  { weekday: "fri", isOpen: true, openTime: "11:00", closeTime: "20:00" },
  { weekday: "sat", isOpen: true, openTime: "11:00", closeTime: "20:00" },
];