import type { Booking, BookingStatus } from "../types/domain";
import { formatCents } from "./money";
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from "./phone";

/** Spanish status labels shared by the admin calendar and the detail modal. */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export function bookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_LABELS[status];
}

/**
 * Pure WhatsApp message builders for the booking lifecycle (feature 009/018).
 * The target phone is normalized (strips `+`, spaces, dashes and a leading `00`)
 * so a number typed as `+58 424-8610492` still works; they return `null` only
 * when the result is not a plausible international number, so the UI never
 * offers a broken link. Accented and special characters are preserved via
 * `encodeURIComponent`.
 */

/** Post-submit notice the client sends to the studio (success panel secondary action). */
export function buildBookingNoticeLink(booking: Booking, phone: string): string | null {
  const target = normalizeWhatsAppNumber(phone);
  if (!isValidWhatsAppNumber(target)) return null;

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

  return `https://wa.me/${target}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Studio confirmation sent to the client after the operator approves the request. */
export function buildBookingConfirmationLink(booking: Booking, phone: string): string | null {
  const target = normalizeWhatsAppNumber(phone);
  if (!isValidWhatsAppNumber(target)) return null;

  const lines = [
    `¡Hola ${booking.clientName}! Confirmamos tu cita en ALPIERCING:`,
    "",
    `Servicio: ${booking.serviceName}`,
    `Fecha: ${booking.date}`,
    `Hora: ${booking.timeSlot}`,
    `Adelanto confirmado: ${formatCents(booking.depositCents)}`,
    "",
    "Te esperamos. ¡Gracias por reservar!",
  ];

  return `https://wa.me/${target}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Studio rejection notice sent to the client after the operator rejects the request. */
export function buildBookingRejectionLink(booking: Booking, phone: string): string | null {
  const target = normalizeWhatsAppNumber(phone);
  if (!isValidWhatsAppNumber(target)) return null;

  const lines = [
    `Hola ${booking.clientName}, no pudimos confirmar tu cita en ALPIERCING:`,
    "",
    `Servicio: ${booking.serviceName}`,
    `Fecha: ${booking.date}`,
    `Hora: ${booking.timeSlot}`,
    "",
    "Escríbenos para elegir otro horario. ¡Gracias por tu comprensión!",
  ];

  return `https://wa.me/${target}?text=${encodeURIComponent(lines.join("\n"))}`;
}
