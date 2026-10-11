/**
 * Date helpers — local (device) timezone only, to avoid UTC off-by-one days.
 * Dates travel as ISO `yyyy-mm-dd`; slots as `HH:mm`.
 */
export function localISODate(reference: Date = new Date()): string {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}