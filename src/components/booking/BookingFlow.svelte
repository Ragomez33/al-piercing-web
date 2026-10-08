<script lang="ts">
  import { onMount } from "svelte";
  import { Clock } from "lucide-svelte";
  import { PIERCING_SERVICES, type PiercingService } from "../../lib/data/services";
  import { buildBookingWhatsAppLink } from "../../lib/utils/booking";
  import { calcDepositCents, formatCents } from "../../lib/utils/money";
  import { WHATSAPP_PHONE } from "../../lib/config";

  let selected = $state<PiercingService | null>(null);
  let date = $state("");
  let time = $state("");
  let clientName = $state("");
  let clientWhatsapp = $state("");
  let notes = $state("");

  const today = (() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  })();

  // Agenda: 11:00 → 19:30 every 30 minutes.
  const SLOT_START_MIN = 11 * 60;
  const SLOT_END_MIN = 19 * 60 + 30;
  const SLOT_STEP_MIN = 30;

  function buildSlots(): string[] {
    const out: string[] = [];
    for (let m = SLOT_START_MIN; m <= SLOT_END_MIN; m += SLOT_STEP_MIN) {
      const h = Math.floor(m / 60).toString().padStart(2, "0");
      const mm = (m % 60).toString().padStart(2, "0");
      out.push(`${h}:${mm}`);
    }
    return out;
  }

  const slots = buildSlots();

  // Deterministic pseudo-availability so the demo behaves like a real agenda and
  // stays stable between renders (no backend in the mono-store build).
  function isUnavailable(slot: string): boolean {
    if (!date) return false;
    let hash = 0;
    const key = `${date}T${slot}`;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 1000;
    return hash % 5 === 0;
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
    revealForm();
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!selected || !formValid) return;
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
      <input type="date" min={today} bind:value={date} onchange={() => { time = ""; }} />
    </label>

    <fieldset class="slots" disabled={!date}>
      <legend>Horario disponible</legend>
      {#if date}
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
      </div>

      <button type="submit" class="submit" disabled={!formValid}>
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

  .submit {
    min-height: 52px;
    border-radius: var(--radius-pill);
    border: none;
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .submit:hover:not(:disabled),
  .submit:focus-visible {
    transform: translateY(-2px);
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
