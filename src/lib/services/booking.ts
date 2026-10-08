/**
 * Booking domain service (feature 009).
 *
 * The ONLY boundary through which booking status transitions occur
 * (constitution §IV) and the only data access path components may use for
 * booking persistence (constitution §2.3). Both stories delegate here; the
 * service builds the courtesy WhatsApp links used by the public and admin UIs.
 */
import { DataError, dataStore } from "../data/store";
import type { Booking, NewBookingInput } from "../types/domain";
import { buildBookingConfirmationLink, buildBookingNoticeLink } from "../utils/booking";

/** Result of persisting a public booking request. */
export interface SubmitBookingResult {
  /** Persisted booking; `status === "PENDING"`. */
  booking: Booking;
  /** WhatsApp notice link (null when the phone is misconfigured). */
  noticeUrl: string | null;
}

/** Result of approving a booking request. */
export interface ApprovalResult {
  /** Updated booking; `status === "CONFIRMED"`. */
  booking: Booking;
  /** WhatsApp confirmation link (null when the phone is misconfigured). */
  confirmationUrl: string | null;
}

async function findBooking(id: string): Promise<Booking | undefined> {
  const bookings = await dataStore.listBookings();
  return bookings.find((booking) => booking.id === id);
}

/**
 * Persists a new request as `PENDING` and returns it with the client notice link.
 * Slot exclusivity is enforced by the data layer (DB partial unique index /
 * local adapter guard); failures surface as typed `DataError` (FR-001/FR-007).
 */
export async function submitBookingRequest(
  input: NewBookingInput,
  phone: string,
): Promise<SubmitBookingResult> {
  const booking = await dataStore.createBooking(input);
  return { booking, noticeUrl: buildBookingNoticeLink(booking, phone) };
}

/**
 * Approves a request: `PENDING → CONFIRMED`. Already-confirmed bookings are a
 * no-op returning the current record (re-sendable link); a cancelled booking is
 * rejected so the final state stays consistent (admin-approval-contract §3/§6).
 */
export async function approveBooking(id: string, phone: string): Promise<ApprovalResult> {
  const existing = await findBooking(id);
  if (!existing) throw new DataError("Reserva no encontrada");
  if (existing.status === "CANCELLED") {
    throw new DataError("No se puede aprobar una reserva cancelada");
  }

  const booking =
    existing.status === "PENDING"
      ? await dataStore.updateBookingStatus(id, "CONFIRMED")
      : existing;

  return { booking, confirmationUrl: buildBookingConfirmationLink(booking, phone) };
}

/**
 * Cancels a request: `PENDING | CONFIRMED → CANCELLED`, releasing its slot.
 * A cancelled booking is terminal and returned unchanged (admin-approval-contract §4).
 */
export async function cancelBooking(id: string): Promise<Booking> {
  const existing = await findBooking(id);
  if (!existing) throw new DataError("Reserva no encontrada");
  if (existing.status === "CANCELLED") return existing;
  return dataStore.updateBookingStatus(id, "CANCELLED");
}
