import type { PiercingService } from "../data/services";
import { calcDepositCents, formatCents } from "./money";

export interface BookingRequest {
  /** Studio WhatsApp number, digits only with country code. */
  phone: string;
  service: PiercingService;
  /** ISO `yyyy-mm-dd`. */
  date: string;
  /** `HH:mm`. */
  time: string;
  clientName: string;
  clientWhatsapp: string;
  notes?: string;
}

/**
 * Builds the pre-filled WhatsApp message for a booking request, including the
 * 50% deposit and the remaining balance. Returns `null` while required data is
 * missing so the UI can disable the submit action.
 */
export function buildBookingWhatsAppLink(request: BookingRequest): string | null {
  const { phone, service, date, time, clientName, clientWhatsapp, notes } = request;
  if (!/^[0-9]+$/.test(phone)) return null;
  if (!service || !date || !time || !clientName.trim() || !clientWhatsapp.trim()) return null;

  const deposit = calcDepositCents(service.priceCents);
  const balance = service.priceCents - deposit;

  const lines = [
    "Hola! Quiero reservar un turno de piercing:",
    "",
    `Servicio: ${service.name}`,
    `Categoría: ${service.category}`,
    `Duración: ${service.durationMinutes} min`,
    `Fecha: ${date}`,
    `Hora: ${time}`,
    "",
    `Precio: ${formatCents(service.priceCents)}`,
    `Seña (50%): ${formatCents(deposit)}`,
    `Saldo en el local: ${formatCents(balance)}`,
    "",
    "Datos del cliente:",
    `Nombre: ${clientName.trim()}`,
    `WhatsApp: ${clientWhatsapp.trim()}`,
  ];

  if (notes && notes.trim()) lines.push(`Notas: ${notes.trim()}`);
  lines.push("", "¿Me confirman disponibilidad para abonar la seña?");

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
