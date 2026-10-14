<script lang="ts">
  import { Ban, Check, MessageCircle, X } from "lucide-svelte";
  import { DataError } from "../../lib/data/store";
  import { approveBooking, cancelBooking, rejectBooking } from "../../lib/services/booking";
  import {
    BOOKING_STATUS_LABELS,
    buildBookingConfirmationLink,
    buildBookingRejectionLink,
  } from "../../lib/utils/booking";
  import { formatCents } from "../../lib/utils/money";
  import { WHATSAPP_FORMAT_HINT, isValidWhatsAppNumber } from "../../lib/utils/phone";
  import type { Booking } from "../../lib/types/domain";

  interface Props {
    booking: Booking;
    onClose: () => void;
    onChanged: (booking: Booking) => void;
    onReschedule: (booking: Booking) => void;
  }

  let { booking, onClose, onChanged, onReschedule }: Props = $props();

  type Acting = "idle" | "approving" | "rejecting" | "cancelling";
  let acting = $state<Acting>("idle");
  let actionError = $state("");
  let proofOpen = $state(false);

  // Notify the CLIENT (feature 018 FR-025): confirmation once approved, rejection
  // once rejected. `null` when the client's number is not digits-only.
  let notifyUrl = $derived(
    booking.status === "CONFIRMED" || booking.status === "COMPLETED"
      ? buildBookingConfirmationLink(booking, booking.clientWhatsapp)
      : booking.status === "REJECTED" || booking.status === "CANCELLED"
        ? buildBookingRejectionLink(booking, booking.clientWhatsapp)
        : null,
  );

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    if (proofOpen) proofOpen = false;
    else onClose();
  }

  async function approve() {
    if (acting !== "idle") return;
    acting = "approving";
    actionError = "";
    try {
      const result = await approveBooking(booking.id, booking.clientWhatsapp);
      onChanged(result.booking);
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo aprobar la cita";
    } finally {
      acting = "idle";
    }
  }

  async function reject() {
    if (acting !== "idle") return;
    acting = "rejecting";
    actionError = "";
    try {
      const updated = await rejectBooking(booking.id);
      onChanged(updated);
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo rechazar la cita";
    } finally {
      acting = "idle";
    }
  }

  async function cancel() {
    if (acting !== "idle") return;
    acting = "cancelling";
    actionError = "";
    try {
      const updated = await cancelBooking(booking.id);
      onChanged(updated);
    } catch (err) {
      actionError = err instanceof DataError ? err.message : "No se pudo cancelar la cita";
    } finally {
      acting = "idle";
    }
  }

  const isPending = $derived(booking.status === "PENDING");
  const isActive = $derived(booking.status === "PENDING" || booking.status === "CONFIRMED");
  const numberValid = $derived(isValidWhatsAppNumber(booking.clientWhatsapp));
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="backdrop" onclick={onClose} role="presentation"></div>
<section class="modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
  <header class="modal-head">
    <h2 id="booking-modal-title">Detalle de la cita</h2>
    <button type="button" class="icon-btn" onclick={onClose} aria-label="Cerrar">
      <X size={20} />
    </button>
  </header>

  <dl class="detail">
    <dt>Cliente</dt>
    <dd>{booking.clientName}</dd>
    <dt>WhatsApp</dt>
    <dd>
      {booking.clientWhatsapp || "—"}
      {#if !numberValid}
        <small class="dd-warn">{WHATSAPP_FORMAT_HINT}</small>
      {/if}
    </dd>
    {#if booking.clientEmail}
      <dt>Email</dt>
      <dd>{booking.clientEmail}</dd>
    {/if}
    <dt>Servicio</dt>
    <dd>{booking.serviceName}</dd>
    <dt>Fecha / Hora</dt>
    <dd>{booking.date} · {booking.timeSlot}</dd>
    <dt>Precio total</dt>
    <dd>{formatCents(booking.priceCents)}</dd>
    <dt>Adelanto</dt>
    <dd class="gold">{formatCents(booking.depositCents)}</dd>
    <dt>Saldo en el local</dt>
    <dd>{formatCents(booking.priceCents - booking.depositCents)}</dd>
    <dt>Estado</dt>
    <dd>
      <span class="badge badge-{booking.status.toLowerCase()}">
        {BOOKING_STATUS_LABELS[booking.status]}
      </span>
    </dd>
  </dl>

  <section class="payment" aria-labelledby="payment-title">
    <h3 id="payment-title">Verificación de pago</h3>
    <dl class="detail">
      <dt>Método</dt>
      <dd>{booking.paymentMethodName || "—"}</dd>
      <dt>Referencia</dt>
      <dd>{booking.paymentReference || "—"}</dd>
    </dl>
    {#if booking.paymentProofUrl}
      <button
        type="button"
        class="proof-thumb"
        onclick={() => (proofOpen = true)}
        aria-label="Ampliar comprobante de pago"
      >
        <img src={booking.paymentProofUrl} alt="Comprobante de pago del cliente" loading="lazy" />
      </button>
    {:else}
      <p class="hint">Sin comprobante de pago.</p>
    {/if}
  </section>

  {#if isPending}
    <div class="actions" aria-label="Acciones principales">
      <button type="button" class="primary" onclick={approve} disabled={acting !== "idle"}>
        <Check size={16} aria-hidden="true" />
        {acting === "approving" ? "Aprobando…" : "Aprobar Cita"}
      </button>
      <button type="button" class="danger" onclick={reject} disabled={acting !== "idle"}>
        <Ban size={16} aria-hidden="true" />
        {acting === "rejecting" ? "Rechazando…" : "Rechazar Cita"}
      </button>
    </div>
  {/if}

  {#if notifyUrl}
    <div class="actions actions-single" aria-label="Notificación">
      <a class="wa-link" href={notifyUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={16} aria-hidden="true" /> Notificar por WhatsApp
      </a>
    </div>
  {:else if booking.status === "CONFIRMED" ||
    booking.status === "REJECTED" ||
    booking.status === "CANCELLED" ||
    booking.status === "COMPLETED"}
    <p class="hint">
      No se puede abrir WhatsApp con «{booking.clientWhatsapp || "sin número"}». {WHATSAPP_FORMAT_HINT}
    </p>
  {/if}

  {#if isActive}
    <div class="actions actions-secondary" aria-label="Acciones secundarias">
      <button
        type="button"
        class="ghost"
        onclick={() => onReschedule(booking)}
        disabled={acting !== "idle"}
      >
        Reagendar
      </button>
      <button type="button" class="danger" onclick={cancel} disabled={acting !== "idle"}>
        {acting === "cancelling" ? "Cancelando…" : "Cancelar Cita"}
      </button>
    </div>
  {/if}

  {#if actionError}
    <p class="error" role="alert">{actionError}</p>
  {/if}
</section>

{#if proofOpen && booking.paymentProofUrl}
  <div class="lightbox" role="dialog" aria-modal="true" aria-label="Comprobante de pago">
    <button type="button" class="lightbox-close" onclick={() => (proofOpen = false)} aria-label="Cerrar">
      <X size={22} />
    </button>
    <img class="lightbox-img" src={booking.paymentProofUrl} alt="Comprobante de pago ampliado" />
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-backdrop);
    z-index: 40;
  }

  .modal {
    position: fixed;
    z-index: 41;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(480px, calc(100% - 2rem));
    max-height: 90vh;
    overflow-y: auto;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-glow);
    padding: 1.25rem;
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .modal-head h2 {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-primary);
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
  }

  .detail {
    margin: 0 0 1rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 1rem;
  }

  .detail dt {
    color: var(--text-muted);
    font-size: 0.82rem;
  }

  .detail dd {
    margin: 0;
    color: var(--text-primary);
    text-align: right;
    overflow-wrap: anywhere;
  }

  .detail dd.gold {
    color: var(--text-gold);
    font-weight: 700;
  }

  .dd-warn {
    display: block;
    margin-top: 0.2rem;
    color: var(--accent-negative);
    font-size: 0.72rem;
  }

  .badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .badge-pending {
    background: var(--status-pending-bg);
    color: var(--text-gold);
    border: 1px solid var(--status-pending-edge);
  }

  .badge-confirmed,
  .badge-completed {
    background: var(--status-confirmed-bg);
    color: var(--accent-positive);
    border: 1px solid var(--status-confirmed-edge);
  }

  .badge-cancelled,
  .badge-rejected {
    background: var(--status-rejected-bg);
    color: var(--accent-negative);
    border: 1px solid var(--status-rejected-edge);
  }

  .payment {
    border-top: var(--divider-subtle);
    padding-top: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .payment h3 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .proof-thumb {
    display: block;
    width: 100%;
    padding: 0;
    border: var(--border-card);
    border-radius: var(--radius-image);
    background: var(--bg-app-body);
    cursor: zoom-in;
    overflow: hidden;
  }

  .proof-thumb img {
    display: block;
    width: 100%;
    max-height: 220px;
    object-fit: contain;
  }

  .proof-thumb:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  /* Single, full-width primary action (e.g. Notificar por WhatsApp). */
  .actions-single {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Every child fills its cell so buttons never end up with odd widths. */
  .actions > * {
    width: 100%;
  }

  .primary,
  .ghost,
  .danger,
  .wa-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-btn);
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    border: none;
  }

  .primary {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
  }

  .ghost {
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    border: var(--border-btn-secondary);
    transition: border-color 160ms ease;
  }

  .ghost:hover:not(:disabled) {
    border: var(--border-btn-secondary-hover);
  }

  /* Subtle destructive style (outlined red), used for Rechazar. */
  .danger {
    background: transparent;
    color: var(--accent-negative);
    border: 1px solid var(--accent-negative);
  }

  .danger:hover:not(:disabled) {
    background: var(--accent-negative-tint);
  }

  .primary:disabled,
  .ghost:disabled,
  .danger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .wa-link {
    border: 1px solid var(--accent-primary);
    color: var(--accent-primary);
    text-decoration: none;
    text-align: center;
  }

  .wa-link:hover,
  .wa-link:focus-visible {
    background: var(--accent-primary);
    color: var(--accent-on);
  }

  .hint {
    margin: 0.25rem 0 0.75rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .error {
    color: var(--accent-negative);
    font-size: 0.9rem;
    margin: 0.25rem 0 0;
  }

  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--overlay-backdrop);
  }

  .lightbox-img {
    max-width: 100%;
    max-height: 90vh;
    border-radius: var(--radius-image);
    box-shadow: var(--shadow-glow);
  }

  .lightbox-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    cursor: pointer;
  }

  @media (prefers-reduced-motion: reduce) {
    .primary,
    .ghost,
    .danger,
    .wa-link {
      transition: none;
    }
  }
</style>
