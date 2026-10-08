/**
 * Date helpers — local (device) timezone only, to avoid UTC off-by-one days.
 * Dates travel as ISO `yyyy-mm-dd`; slots as `HH:mm`.
 */
export function localISODate(reference: Date = new Date()): string {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Agenda boundaries: 11:00 → 19:30 in 30-minute steps. */
export const AGENDA_START_MIN = 11 * 60;
export const AGENDA_END_MIN = 19 * 60 + 30;
export const AGENDA_STEP_MIN = 30;

export interface AgendaSlot {
  time: string;
}

export function buildAgenda(): AgendaSlot[] {
  const slots: AgendaSlot[] = [];
  for (let m = AGENDA_START_MIN; m <= AGENDA_END_MIN; m += AGENDA_STEP_MIN) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push({ time: `${h}:${mm}` });
  }
  return slots;
}

export function agendaTimes(): string[] {
  return buildAgenda().map((slot) => slot.time);
}