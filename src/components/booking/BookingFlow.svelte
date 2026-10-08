<script lang="ts">
  import { onMount } from "svelte";
  import { Clock } from "lucide-svelte";
  import { PIERCING_SERVICES, type PiercingService } from "../../lib/data/services";
  import { buildBookingWhatsAppLink } from "../../lib/utils/booking";
  import { calcDepositCents, formatCents } from "../../lib/utils/money";
  import { PAYMENT_BINANCE_PAY, PAYMENT_PAGO_MOVIL, WHATSAPP_PHONE } from "../../lib/config";
  import { DataError, dataStore } from "../../lib/data/store";
  import { agendaTimes, localISODate } from "../../lib/utils/dates";

  let selected = $state<PiercingService | null>(null);
  let date = $state("");
  let time = $state("");
  let clientName = $state("");
  let clientWhatsapp = $state("");
  let notes = $state("");

  // Real availability via the data layer (FR-004) — no deterministic fake agenda.
  let bookedSlots = $state<string[]>([]);
  let slotsLoading = $state(false);
  let submitError = $state("");
  let submitting = $state(false);

  const today = localISODate();
  const slots = agendaTimes();

  async function onDateChange() {
    time = "";
    submitError = "";
    if (!date) {
      bookedSlots = [];
      return;
    }
    slotsLoading = true;
    try {
      const [booked, blocked] = await Promise.all([
        dataStore.getBookedSlots(date),
        dataStore.getBlockedSlots(date),
      ]);
      bookedSlots = [...new Set([...booked, ...blocked])];
    } catch (err) {
      bookedSlots = [];
      submitError = err instanceof DataError ? err.message : "No se pudo consultar la agenda";
    } finally {
      slotsLoading = false;
    }
  }

  function isUnavailable(slot: string): boolean {
    return bookedSlots.includes(slot);
  }

  let depositCents = $derived(selected ? calcDepositCents(selected.priceCents) : 0);
  let balanceCents = $derived(selected ? selected.priceCents - depositCents : 0);

  let formValid = $derived(
    !!selected &&
      !!date &&
      !!time &&
      clientName.trim().length > 1 &&
      clientWhatsapp.trim().length >= 7,
  );

  function revealForm() {
    requestAnimationFrame(() => {
      document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectService(service: PiercingService) {
    selected = service;
    time = "";
    submitError = "";
    revealForm();
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!selected || !formValid || submitting) return;
    submitting = true;
    submitError = "";
    try {
      // Persist FIRST, then open WhatsApp (FR-006).
      await dataStore.createBooking({
        clientName: clientName.trim(),
        clientWhatsapp: clientWhatsapp.trim(),
        serviceId: selected.id,
        serviceName: selected.name,
        priceCents: selected.priceCents,
        date,
        timeSlot: time,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      submitError =
        err instanceof DataError ? err.message : "No se pudo registrar la cita. Intentalo de nuevo.";
      submitting = false;
      return;
    }
    submitting = false;
    const link = buildBookingWhatsAppLink({
      phone: WHATSAPP_PHONE,
      service: selected,
      date,
      time,
      clientName,
      clientWhatsapp,
      notes,
    });
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  onMount(() => {
    const id = new URLSearchParams(window.location.search).get("service");
    if (!id) return;
    const match = PIERCING_SERVICES.find((service) => service.id === id);
    if (match) {
      selected = match;
      revealForm();
    }
  });
</script>

<section class="services" aria-labelledby="services-title">
  <h2 id="services-title">1. Elegí tu servicio</h2>
  <ul class="service-list">
    {#each PIERCING_SERVICES as service (service.id)}
      <li>
        <button
          type="button"
          class="service"
          class:selected={selected?.id === service.id}
          aria-pressed={selected?.id === service.id}
          onclick={() => selectService(service)}
        >
          <span class="service-main">
            <span class="service-head">
              <span class="service-name">{service.name}</span>
              <span class="chip">{service.category}</span>
            </span>
            <span class="service-desc">{service.description}</span>
            <span class="service-meta">
              <Clock size={14} aria-hidden="true" />
              {service.durationMinutes} min
              {#if service.requiresDeposit}
                <span class="dot">·</span> Requiere seña
              {/if}
            </span>
          </span>
          <span class="service-price">{formatCents(service.priceCents)}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

{#if selected}
  <section class="booking" id="booking-form" aria-labelledby="booking-title">
    <div class="selected-summary">
      <div>
        <span class="summary-label">Servicio elegido</span>
        <strong>{selected.name}</strong>
      </div>
      <span class="service-price">{formatCents(selected.priceCents)}</span>
    </div>

    <h2 id="booking-title">2. Elegí fecha y hora</h2>

    <label class="field">
      <span>Fecha</span>
      <input type="date" min={today} bind:value={date} onchange={onDateChange} />
    </label>

    <fieldset class="slots" disabled={!date}>
      <legend>Horario disponible</legend>
      {#if date}
        {#if slotsLoading}
          <p class="hint" aria-live="polite">Consultando disponibilidad…</p>
        {:else}
          <div class="slot-grid">
            {#each slots as slot (slot)}
              <button
                type="button"
                class="slot"
                class:active={time === slot}
                disabled={isUnavailable(slot)}
                aria-pressed={time === slot}
                onclick={() => { time = slot; }}
              >
                {slot}
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <p class="hint">Elegí una fecha para ver los horarios disponibles.</p>
      {/if}
    </fieldset>

    <h2>3. Tus datos</h2>

    <form onsubmit={submit}>
      <label class="field">
        <span>Nombre completo</span>
        <input type="text" bind:value={clientName} autocomplete="name" required />
      </label>

      <label class="field">
        <span>Tu WhatsApp</span>
        <input
          type="tel"
          bind:value={clientWhatsapp}
          autocomplete="tel"
          inputmode="tel"
          placeholder="5215500000000"
          required
        />
      </label>

      <label class="field">
        <span>Notas (opcional)</span>
        <textarea bind:value={notes} rows="3" placeholder="Referencias, dudas, alergias..."></textarea>
      </label>

      <div class="deposit">
        <div class="deposit-row">
          <span>Precio del servicio</span>
          <span class="amount">{formatCents(selected.priceCents)}</span>
        </div>
        <div class="deposit-row deposit-strong">
          <span>Seña a abonar (50%)</span>
          <span class="amount">{formatCents(depositCents)}</span>
        </div>
        <div class="deposit-row">
          <span>Saldo en el local</span>
          <span class="amount amount-muted">{formatCents(balanceCents)}</span>
        </div>
        <div class="deposit-payments">
          <span class="pay-label">Datos para abonar la seña</span>
          <span>
            <strong>{PAYMENT_PAGO_MOVIL.label}:</strong> {PAYMENT_PAGO_MOVIL.ref}
          </span>
          <span>
            <strong>{PAYMENT_BINANCE_PAY.label}:</strong> {PAYMENT_BINANCE_PAY.ref}
          </span>
        </div>
      </div>

      {#if submitError}
        <p class="error" role="alert">{submitError}</p>
      {/if}

      <button type="submit" class="submit" disabled={!formValid || submitting}>
        Confirmar turno por WhatsApp
      </button>
      {#if !formValid}
        <p class="hint">Completá nombre, WhatsApp, fecha y hora para continuar.</p>
      {/if}
    </form>
  </section>
{/if}

<style>
  .services,
  .booking {
    max-width: 760px;
    margin: 0 auto;
    padding: 2rem 1.25rem 0;
  }

  h2 {
    font-size: 1.35rem;
    color: var(--text-primary);
    margin: 0 0 1rem;
  }

  .service-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .service {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    text-align: left;
    padding: 1rem 1.15rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  }

  .service:hover,
  .service:focus-visible {
    transform: translateY(-2px);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .service.selected {
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-glow);
  }

  .service-main {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .service-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .service-name {
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--text-primary);
  }

  .chip {
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.65rem;
    border-radius: var(--radius-pill);
  }

  .service-desc {
    color: var(--text-secondary);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .service-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .dot {
    color: var(--text-muted);
  }

  .service-price {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .booking {
    padding-bottom: 1rem;
  }

  .selected-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.15rem;
    margin-bottom: 1.5rem;
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    border-radius: var(--radius-card);
  }

  .summary-label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-bottom: 0.15rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .field input,
  .field textarea {
    font: inherit;
    color: var(--text-primary);
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    border-radius: var(--radius-image);
    padding: 0.75rem 0.9rem;
    min-height: 48px;
  }

  .field input:focus-visible,
  .field textarea:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 1px;
  }

  .slots {
    border: none;
    padding: 0;
    margin: 0 0 1.5rem;
  }

  .slots legend {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .slot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
    gap: 0.5rem;
  }

  .slot {
    min-height: 44px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .slot.active {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .slot:disabled {
    background: var(--bg-surface-elevated);
    color: var(--text-muted);
    cursor: not-allowed;
  }

  .slot:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  form {
    display: flex;
    flex-direction: column;
  }

  .deposit {
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 1rem 1.15rem;
    margin: 0.5rem 0 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .deposit-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .deposit-strong {
    color: var(--text-primary);
    font-weight: 700;
  }

  .deposit-strong .amount {
    color: var(--accent-primary);
  }

  .amount {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .amount-muted {
    color: var(--text-secondary);
  }

  .deposit-payments {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-top: var(--border-card);
    padding-top: 0.75rem;
    margin-top: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .pay-label {
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .error {
    color: var(--accent-negative);
    font-size: 0.9rem;
    text-align: center;
    margin: 0 0 0.75rem;
  }

  .submit {
    min-height: 52px;
    border-radius: var(--radius-btn);
    border: none;
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .submit:hover:not(:disabled),
  .submit:focus-visible {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .submit:disabled {
    background: var(--bg-badge-pill);
    color: var(--text-muted);
    box-shadow: none;
    cursor: not-allowed;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0.75rem 0 0;
    text-align: center;
  }
</style>
