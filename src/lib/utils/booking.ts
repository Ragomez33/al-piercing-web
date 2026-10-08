import type { Booking } from "../types/domain";

/**
 * Pure WhatsApp message builders for the booking lifecycle (feature 009).
 * Both return `null` while the configured phone is not digits-only, so the UI
 * never offers a broken link (research R5, FR-004/FR-011/FR-015). Accented and
 * special characters are preserved via `encodeURIComponent`.
 */

/** Post-submit notice the client sends to the studio (success panel secondary action). */
export function buildBookingNoticeLink(booking: Booking, phone: string): string | null {
  if (!/^[0-9]+$/.test(phone)) return null;

  const lines = [
    "Hola, acabo de solicitar una reserva en ALPIERCING:",
    "",
    `Servicio: ${booking.serviceName}`,
    `Fecha: ${booking.date}`,
    `Hora: ${booking.timeSlot}`,
    "",
    `Nombre: ${booking.clientName}`,
    "",
    "¿Me confirman disponibilidad? ¡Gracias!",
  ];

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Studio confirmation sent to the client after the operator approves the request. */
export function buildBookingConfirmationLink(booking: Booking, phone: string): string | null {
  if (!/^[0-9]+$/.test(phone)) return null;

  const lines = [
    `¡Hola ${booking.clientName}! Confirmamos tu turno en ALPIERCING:`,
    "",
    `Servicio: ${booking.serviceName}`,
    `Fecha: ${booking.date}`,
    `Hora: ${booking.timeSlot}`,
    "",
    "Te esperamos. ¡Gracias por reservar!",
  ];

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
