<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Clock, Upload } from "lucide-svelte";
  import { type PiercingService } from "../../lib/data/services";
  import { submitBookingRequest } from "../../lib/services/booking";
  import { getDayAvailability } from "../../lib/services/availability";
  import { uploadPaymentProofImage } from "../../lib/services/storage";
  import { calcDepositCents, formatCents } from "../../lib/utils/money";
  import { fieldsForType, paymentMethodTypeLabel } from "../../lib/utils/payments";
  import { WHATSAPP_COUNTRY_CODE, WHATSAPP_PHONE } from "../../lib/config";
  import {
    DataError,
    dataStore,
    listFallbackPaymentMethods,
    listFallbackServices,
  } from "../../lib/data/store";
  import { subscribeToDataChanges } from "../../lib/data/realtime";
  import { localISODate } from "../../lib/utils/dates";
  import {
    WHATSAPP_FORMAT_HINT,
    isValidWhatsAppNumber,
    normalizeWhatsAppNumber,
  } from "../../lib/utils/phone";
  import type { PaymentMethod } from "../../lib/types/domain";

  let selected = $state<PiercingService | null>(null);
  let date = $state("");
  let time = $state("");
  let clientName = $state("");
  let clientWhatsapp = $state("");
  let notes = $state("");

  // Real availability via the availability service (feature 017): only genuinely
  // free slots are rendered — in working hours, not booked, not covered by blocks.
  let freeSlots = $state<string[]>([]);
  let slotsLoading = $state(false);
  let availabilityNotice = $state("");
  let submitError = $state("");
  let submitting = $state(false);

  // Live refresh (feature 017 FR-019): blocks/bookings/schedule changes land here
  // without a reload; failures keep the last known availability.
  let liveTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeLive: (() => void) | null = null;

  // Service menu loaded from the managed data source (feature 011, FR-002).
  let services = $state<PiercingService[]>([]);
  let servicesLoading = $state(true);
  let servicesNotice = $state("");

  // Deposit payment step (feature 018). Only rendered when the chosen service
  // requires a deposit.
  let paymentMethods = $state<PaymentMethod[]>([]);
  let paymentMethodsLoading = $state(false);
  let paymentMethodsNotice = $state("");
  let selectedMethodId = $state("");
  let paymentReference = $state("");
  let proofPreviewUrl = $state("");
  let proofPublicUrl = $state("");
  let proofUploading = $state(false);
  let proofError = $state("");

  // Success panel (feature 009)
  let successOpen = $state(false);
  let noticeUrl = $state<string | null>(null);
  let successModal = $state<HTMLElement | null>(null);
  let lastFocused: HTMLElement | null = null;

  const today = localISODate();

  function closeSuccess() {
    successOpen = false;
    noticeUrl = null;
    lastFocused?.focus();
    lastFocused = null;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (successOpen && event.key === "Escape") closeSuccess();
  }

  // Move focus into the dialog when it opens (booking-flow-contract §2).
  $effect(() => {
    if (successOpen && successModal) successModal.focus();
  });

  async function loadAvailability(showLoading: boolean) {
    if (!date || !selected) {
      freeSlots = [];
      return;
    }
    if (showLoading) slotsLoading = true;
    try {
      const availability = await getDayAvailability(date, selected.durationMinutes);
      freeSlots = availability.slots;
      availabilityNotice = "";
    } catch (err) {
      // Non-blocking: keep the last known slots; only surface a notice when the
      // day is effectively empty (no previous data for this date).
      availabilityNotice = err instanceof DataError ? err.message : "No se pudo consultar la agenda";
    } finally {
      if (showLoading) slotsLoading = false;
    }
  }

  function onDateChange() {
    time = "";
    submitError = "";
    availabilityNotice = "";
    if (!date) {
      freeSlots = [];
      return;
    }
    // Fresh date: clear the previous day's slots before loading.
    freeSlots = [];
    void loadAvailability(true);
  }

  function scheduleLiveRefresh() {
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      if (date && selected) void loadAvailability(false);
    }, 250);
  }

  let depositCents = $derived(selected ? calcDepositCents(selected.priceCents) : 0);
  let balanceCents = $derived(selected ? selected.priceCents - depositCents : 0);

  let requiresDeposit = $derived(selected?.requiresDeposit ?? false);
  let selectedMethod = $derived(
    paymentMethods.find((method) => method.id === selectedMethodId) ?? null,
  );
  let methodFields = $derived(selectedMethod ? fieldsForType(selectedMethod.type) : []);
  // Payment is valid when no deposit is required, or a method + reference + a
  // successfully uploaded proof are all present (feature 018 FR-010/FR-013).
  let paymentValid = $derived(
    !requiresDeposit ||
      (!!selectedMethodId && paymentReference.trim().length > 0 && proofPublicUrl.length > 0),
  );

  let formValid = $derived(
    !!selected &&
      !!date &&
      !!time &&
      clientName.trim().length > 1 &&
      isValidWhatsAppNumber(clientWhatsapp),
  );

  // WhatsApp format guidance (feature 018 fix): only digits with country code.
  let whatsappTouched = $state(false);
  let whatsappError = $derived(
    whatsappTouched && !isValidWhatsAppNumber(clientWhatsapp) ? WHATSAPP_FORMAT_HINT : "",
  );

  function normalizeWhatsapp() {
    clientWhatsapp = normalizeWhatsAppNumber(clientWhatsapp);
    whatsappTouched = true;
  }

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
    const submittedTime = time;
    try {
      // Persist FIRST as PENDING, then offer WhatsApp as a deliberate secondary
      // action on the success panel (FR-001/FR-003/FR-004).
      const result = await submitBookingRequest(
        {
          clientName: clientName.trim(),
          clientWhatsapp: normalizeWhatsAppNumber(clientWhatsapp),
          serviceId: selected.id,
          serviceName: selected.name,
          priceCents: selected.priceCents,
          date,
          timeSlot: submittedTime,
          notes: notes.trim() || undefined,
          // Deposit payment (feature 018) — omitted entirely for non-deposit services.
          ...(selected.requiresDeposit
            ? {
                paymentMethodId: selectedMethodId,
                paymentMethodName: selectedMethod?.title ?? "",
                paymentReference: paymentReference.trim(),
                paymentProofUrl: proofPublicUrl,
              }
            : {}),
        },
        WHATSAPP_PHONE,
      );

      // Immediately hold the slot in the public view (no refetch) and clear the
      // client form so the same data cannot be resubmitted (FR-005/FR-006).
      freeSlots = freeSlots.filter((slot) => slot !== submittedTime);
      clientName = "";
      clientWhatsapp = "";
      notes = "";
      time = "";
      whatsappTouched = false;
      resetPaymentState();

      noticeUrl = result.noticeUrl;
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      successOpen = true;
    } catch (err) {
      // Persistence failed: no WhatsApp, visible error, retryable (FR-007).
      submitError =
        err instanceof DataError ? err.message : "No se pudo registrar la cita. Intentalo de nuevo.";
      void loadAvailability(false);
    } finally {
      submitting = false;
    }
  }

  async function loadServices() {
    servicesLoading = true;
    servicesNotice = "";
    try {
      services = await dataStore.listServices();
    } catch {
      // Non-blocking fallback to the demo seed served by the data layer (FR-012).
      try {
        services = await listFallbackServices();
      } catch {
        services = [];
      }
      servicesNotice = "No se pudo cargar la lista en línea; mostrando el menú local.";
    } finally {
      servicesLoading = false;
    }
  }

  function resetPaymentState() {
    selectedMethodId = "";
    paymentReference = "";
    proofPublicUrl = "";
    proofError = "";
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    proofPreviewUrl = "";
  }

  async function loadPaymentMethods() {
    paymentMethodsLoading = true;
    paymentMethodsNotice = "";
    try {
      paymentMethods = await dataStore.listPaymentMethods();
    } catch {
      // Non-blocking fallback to the demo seed served by the data layer (FR-012).
      try {
        paymentMethods = await listFallbackPaymentMethods();
      } catch {
        paymentMethods = [];
      }
      paymentMethodsNotice = "No se pudieron cargar los métodos de pago; mostrando los de ejemplo.";
    } finally {
      paymentMethodsLoading = false;
    }
  }

  async function onProofSelected(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    proofError = "";
    if (!file) return;
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    proofPreviewUrl = URL.createObjectURL(file);
    proofUploading = true;
    proofPublicUrl = "";
    try {
      proofPublicUrl = await uploadPaymentProofImage(file);
    } catch (err) {
      proofError = err instanceof DataError ? err.message : "No se pudo subir el comprobante";
    } finally {
      proofUploading = false;
    }
  }

  onMount(async () => {
    await Promise.all([loadServices(), loadPaymentMethods()]);
    unsubscribeLive = subscribeToDataChanges(
      ["blocks", "bookings", "schedule", "paymentMethods"],
      () => {
        scheduleLiveRefresh();
        void loadPaymentMethods();
      },
    );
    const id = new URLSearchParams(window.location.search).get("service");
    if (!id) return;
    const match = services.find((service) => service.id === id);
    if (match) {
      selected = match;
      revealForm();
    }
  });

  onDestroy(() => {
    unsubscribeLive?.();
    if (liveTimer) clearTimeout(liveTimer);
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
  });
</script>

<svelte:window onkeydown={onWindowKeydown} />

<section class="services" aria-labelledby="services-title">
  <h2 id="services-title">1. Elegí tu servicio</h2>
  {#if servicesNotice}
    <p class="hint" role="status">{servicesNotice}</p>
  {/if}

  {#if servicesLoading}
    <p class="hint" aria-live="polite">Cargando servicios…</p>
  {:else if services.length === 0}
    <p class="empty-state" role="status">No hay servicios disponibles por el momento.</p>
  {:else}
  <ul class="service-list">
    {#each services as service (service.id)}
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
                <span class="dot">·</span> Requiere adelanto
              {/if}
            </span>
          </span>
          <span class="service-price">{formatCents(service.priceCents)}</span>
        </button>
      </li>
    {/each}
  </ul>
  {/if}
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
      <input class="input" type="date" min={today} bind:value={date} onchange={onDateChange} />
    </label>

    <fieldset class="slots" disabled={!date}>
      <legend>Horario disponible</legend>
      {#if date}
        {#if slotsLoading}
          <p class="hint" aria-live="polite">Consultando disponibilidad…</p>
        {:else}
          {#if availabilityNotice}
            <p class="hint" role="status">{availabilityNotice}</p>
          {/if}
          {#if freeSlots.length === 0}
            <p class="hint">No hay horarios disponibles para esta fecha.</p>
          {:else}
            <div class="slot-grid">
              {#each freeSlots as slot (slot)}
                <button
                  type="button"
                  class="slot"
                  class:active={time === slot}
                  aria-pressed={time === slot}
                  onclick={() => { time = slot; }}
                >
                  {slot}
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      {:else}
        <p class="hint">Elegí una fecha para ver los horarios disponibles.</p>
      {/if}
    </fieldset>

    <h2>3. Tus datos</h2>

    <form onsubmit={submit}>
      <label class="field">
        <span>Nombre completo</span>
        <input class="input" type="text" bind:value={clientName} autocomplete="name" required />
      </label>

      <label class="field">
        <span>Tu WhatsApp (+{WHATSAPP_COUNTRY_CODE})</span>
        <input
          class="input"
          type="tel"
          bind:value={clientWhatsapp}
          autocomplete="tel"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="15"
          placeholder="4248610492"
          aria-invalid={!!whatsappError}
          aria-describedby={whatsappError ? "wa-error" : "wa-help"}
          onblur={normalizeWhatsapp}
          required
        />
        {#if whatsappError}
          <small id="wa-error" class="field-error" role="alert">{whatsappError}</small>
        {:else}
          <small id="wa-help" class="field-help">{WHATSAPP_FORMAT_HINT}</small>
        {/if}
      </label>

      <label class="field">
        <span>Notas (opcional)</span>
        <textarea class="input" bind:value={notes} rows="3" placeholder="Referencias, dudas, alergias..."></textarea>
      </label>

      <div class="deposit">
        <div class="deposit-row">
          <span>Precio del servicio</span>
          <span class="amount">{formatCents(selected.priceCents)}</span>
        </div>
        <div class="deposit-row deposit-strong">
          <span>Adelanto a abonar (50%)</span>
          <span class="amount">{formatCents(depositCents)}</span>
        </div>
        <div class="deposit-row">
          <span>Saldo en el local</span>
          <span class="amount amount-muted">{formatCents(balanceCents)}</span>
        </div>
      </div>

      {#if requiresDeposit}
        <div class="payment-step">
          <h3 class="pay-step-title">4. Pago del adelanto</h3>

          {#if paymentMethodsNotice}
            <p class="hint" role="status">{paymentMethodsNotice}</p>
          {/if}

          {#if paymentMethodsLoading}
            <p class="hint" aria-live="polite">Cargando métodos de pago…</p>
          {:else if paymentMethods.length === 0}
            <p class="hint" role="status">
              No hay métodos de pago disponibles por el momento. Escríbenos por WhatsApp para coordinar
              tu adelanto.
            </p>
          {:else}
            <fieldset class="methods" disabled={proofUploading}>
              <legend>Método de pago</legend>
              <div class="method-list">
                {#each paymentMethods as method (method.id)}
                  <button
                    type="button"
                    class="method"
                    class:active={selectedMethodId === method.id}
                    aria-pressed={selectedMethodId === method.id}
                    onclick={() => { selectedMethodId = method.id; }}
                  >
                    <span class="method-name">{method.title}</span>
                    <span class="chip">{paymentMethodTypeLabel(method.type)}</span>
                  </button>
                {/each}
              </div>
            </fieldset>

            {#if selectedMethod}
              <div class="method-details">
                {#each methodFields as field (field.key)}
                  {#if (selectedMethod.details[field.key] ?? "").trim()}
                    <span><strong>{field.label}:</strong> {selectedMethod.details[field.key]}</span>
                  {/if}
                {/each}
                {#if selectedMethod.instructions}
                  <p class="method-instructions">{selectedMethod.instructions}</p>
                {/if}
              </div>
            {/if}

            <label class="field">
              <span>Número de referencia</span>
              <input
                class="input"
                type="text"
                bind:value={paymentReference}
                placeholder="Ej. 123456789"
                required
              />
            </label>

            <label class="field">
              <span>Captura del comprobante</span>
              <input
                class="input file"
                type="file"
                accept="image/*"
                onchange={onProofSelected}
                required
              />
            </label>
            {#if proofUploading}
              <p class="hint" aria-live="polite">Subiendo comprobante…</p>
            {:else if proofPublicUrl}
              <p class="hint ok" role="status">Comprobante cargado.</p>
            {/if}
            {#if proofPreviewUrl}
              <img class="proof-preview" src={proofPreviewUrl} alt="Vista previa del comprobante" />
            {/if}
            {#if proofError}
              <p class="error" role="alert">{proofError}</p>
            {/if}
          {/if}
        </div>
      {/if}

      {#if submitError}
        <p class="error" role="alert">{submitError}</p>
      {/if}

      <button type="submit" class="submit" disabled={!formValid || !paymentValid || submitting}>
        {submitting ? "Procesando reserva…" : "Solicitar cita"}
      </button>
      {#if !formValid}
        <p class="hint">Completá nombre, WhatsApp, fecha y hora para continuar.</p>
      {:else if !paymentValid}
        <p class="hint">Elegí un método de pago, coloca la referencia y sube el comprobante.</p>
      {/if}
    </form>
  </section>
{/if}

{#if successOpen}
  <div class="success-backdrop" role="presentation"></div>
  <section
    class="success-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="success-title"
    tabindex="-1"
    bind:this={successModal}
  >
    <h2 id="success-title">
      Solicitud enviada con éxito. El estudio verificará tu cupo a la brevedad.
    </h2>
    {#if noticeUrl}
      <a class="success-wa" href={noticeUrl} target="_blank" rel="noopener noreferrer">
        Enviar comprobante / aviso por WhatsApp
      </a>
    {/if}
    <button type="button" class="success-close" onclick={closeSuccess}>Nueva solicitud</button>
  </section>
{/if}

<style>
  .services,
  .booking {
    max-width: 760px;
    margin: 0 auto;
    padding: clamp(1.5rem, 5vw, 2rem) clamp(1rem, 4vw, 1.25rem) 0;
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

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    font-size: 1.05rem;
    padding: 2.5rem 1rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-light);
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
    overflow-wrap: anywhere;
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
    flex-wrap: wrap;
    padding: 1rem 1.15rem;
    margin-bottom: 1.5rem;
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    border-radius: var(--radius-card);
  }

  .selected-summary > div {
    min-width: 0;
  }

  .selected-summary strong {
    overflow-wrap: anywhere;
  }

  .summary-label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-bottom: 0.15rem;
  }

  /* Vertical rhythm only; the field/control skin is global (tokens.css). */
  .field {
    margin-bottom: 1rem;
  }

  .field-help {
    display: block;
    margin-top: 0.35rem;
    color: var(--text-muted);
    font-size: 0.78rem;
  }

  .field-error {
    display: block;
    margin-top: 0.35rem;
    color: var(--accent-negative);
    font-size: 0.8rem;
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
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
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
    gap: 0.5rem;
    flex-wrap: wrap;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .deposit-row span {
    min-width: 0;
    overflow-wrap: anywhere;
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

  /* Deposit payment step (feature 018) */
  .payment-step {
    margin: 0.5rem 0 1.25rem;
    padding-top: 0.5rem;
    border-top: var(--divider-subtle);
  }

  .pay-step-title {
    font-size: 1.15rem;
    color: var(--text-primary);
    margin: 0 0 0.75rem;
  }

  .methods {
    border: none;
    padding: 0;
    margin: 0 0 1rem;
  }

  .methods legend {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .method-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .method {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.5rem 0.9rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
  }

  .method.active {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .method:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .method-name {
    overflow-wrap: anywhere;
  }

  .method-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    padding: 0.85rem 1rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
    font-size: 0.92rem;
  }

  .method-instructions {
    margin: 0.35rem 0 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .file {
    padding: 0.5rem;
  }

  .proof-preview {
    width: 100%;
    max-height: 240px;
    object-fit: contain;
    border-radius: var(--radius-image);
    border: var(--border-card);
    margin-bottom: 0.75rem;
    background: var(--bg-app-body);
  }

  .hint.ok {
    color: var(--accent-positive);
  }

  .error {
    color: var(--accent-negative);
    font-size: 0.9rem;
    text-align: center;
    margin: 0 0 0.75rem;
  }

  .submit {
    width: 100%;
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

  /* Success panel (feature 009) */
  .success-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-backdrop);
    z-index: 40;
  }

  .success-modal {
    position: fixed;
    z-index: 41;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(440px, calc(100% - 2rem));
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-glow);
  }

  .success-modal:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 3px;
  }

  .success-modal h2 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .success-wa {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--accent-primary);
    border: 1px solid var(--accent-primary);
    font-weight: 600;
    text-decoration: none;
    text-align: center;
  }

  .success-wa:hover,
  .success-wa:focus-visible {
    background: var(--accent-primary);
    color: var(--accent-on);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .success-close {
    min-height: 44px;
    border-radius: var(--radius-btn);
    border: none;
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: var(--shadow-glow);
  }

  .success-close:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }
</style>
