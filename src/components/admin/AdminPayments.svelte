<script lang="ts">
  import { onMount } from "svelte";
  import { Pencil, Plus, Power, Trash2, X } from "lucide-svelte";
  import { DataError, dataStore } from "../../lib/data/store";
  import {
    PAYMENT_METHOD_TYPES,
    fieldsForType,
    missingRequiredFields,
    paymentMethodTypeLabel,
  } from "../../lib/utils/payments";
  import type { PaymentMethod, PaymentMethodDetails, PaymentMethodType } from "../../lib/types/domain";

  let methods = $state<PaymentMethod[]>([]);
  let methodsLoading = $state(false);
  let methodsLoaded = $state(false);
  let methodsError = $state("");
  let rowBusy = $state<Record<string, boolean>>({});

  // Create/edit modal
  let showForm = $state(false);
  let editingId = $state<string | null>(null);
  let formType = $state<PaymentMethodType>("pago_movil");
  let formTitle = $state("");
  let formInstructions = $state("");
  let formDetails = $state<PaymentMethodDetails>({});
  let formError = $state("");
  let saving = $state(false);

  // Delete confirmation
  let deleting = $state<PaymentMethod | null>(null);
  let deleteBusy = $state(false);
  let deleteError = $state("");

  async function refresh() {
    methodsLoading = true;
    methodsError = "";
    try {
      methods = await dataStore.listPaymentMethods({ includeInactive: true });
      methodsLoaded = true;
    } catch (err) {
      methodsError = err instanceof DataError ? err.message : "No se pudieron cargar los métodos";
    } finally {
      methodsLoading = false;
    }
  }

  function emptyDetailsFor(type: PaymentMethodType): PaymentMethodDetails {
    const details: PaymentMethodDetails = {};
    for (const field of fieldsForType(type)) details[field.key] = "";
    return details;
  }

  function openCreate() {
    editingId = null;
    formType = "pago_movil";
    formTitle = "";
    formInstructions = "";
    formDetails = emptyDetailsFor(formType);
    formError = "";
    showForm = true;
  }

  function openEdit(method: PaymentMethod) {
    editingId = method.id;
    formType = method.type;
    formTitle = method.title;
    formInstructions = method.instructions;
    formDetails = { ...emptyDetailsFor(method.type), ...method.details };
    formError = "";
    showForm = true;
  }

  function changeType(next: PaymentMethodType) {
    const carried: PaymentMethodDetails = {};
    for (const field of fieldsForType(next)) carried[field.key] = formDetails[field.key] ?? "";
    formDetails = carried;
    formType = next;
  }

  function closeForm() {
    showForm = false;
    editingId = null;
    formError = "";
  }

  async function save() {
    if (saving) return;
    formError = "";
    const title = formTitle.trim();
    if (title.length === 0) {
      formError = "El título es obligatorio";
      return;
    }
    const missing = missingRequiredFields(formType, formDetails);
    if (missing.length > 0) {
      formError = `Completa los datos obligatorios: ${missing.join(", ")}`;
      return;
    }
    saving = true;
    try {
      const input = {
        type: formType,
        title,
        details: { ...formDetails },
        instructions: formInstructions.trim(),
      };
      const record = editingId
        ? await dataStore.updatePaymentMethod(editingId, input)
        : await dataStore.createPaymentMethod(input);
      methods = editingId
        ? methods.map((method) => (method.id === record.id ? record : method))
        : [...methods, record];
      closeForm();
    } catch (err) {
      formError = err instanceof DataError ? err.message : "No se pudo guardar el método";
    } finally {
      saving = false;
    }
  }

  async function toggle(method: PaymentMethod) {
    rowBusy[method.id] = true;
    methodsError = "";
    try {
      const updated = await dataStore.togglePaymentMethodActive(method.id);
      methods = methods.map((row) => (row.id === updated.id ? updated : row));
    } catch (err) {
      methodsError = err instanceof DataError ? err.message : "No se pudo cambiar el estado";
    } finally {
      rowBusy[method.id] = false;
    }
  }

  function askDelete(method: PaymentMethod) {
    deleting = method;
    deleteError = "";
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    deleteBusy = true;
    deleteError = "";
    try {
      await dataStore.deletePaymentMethod(deleting.id);
      methods = methods.filter((method) => method.id !== deleting?.id);
      deleting = null;
    } catch (err) {
      deleteError = err instanceof DataError ? err.message : "No se pudo eliminar el método";
    } finally {
      deleteBusy = false;
    }
  }

  onMount(() => void refresh());
</script>

<div class="toolbar">
  <button type="button" class="primary" onclick={openCreate}>
    <Plus size={18} aria-hidden="true" /> Nuevo Método de Pago
  </button>
</div>

{#if methodsLoading && !methodsLoaded}
  <p class="hint" aria-live="polite">Cargando métodos de pago…</p>
{:else if methodsError && !methodsLoaded}
  <p class="error" role="alert">{methodsError}</p>
{:else}
  {#if methodsError}
    <p class="error" role="alert">{methodsError}</p>
  {/if}

  {#if methods.length === 0}
    <p class="empty-state">Aún no hay métodos de pago configurados.</p>
  {:else}
    <ul class="rows">
      {#each methods as method (method.id)}
        <li class="row" class:busy={rowBusy[method.id]} aria-busy={rowBusy[method.id]}>
          <div class="row-main">
            <strong class="row-title">{method.title}</strong>
            <span class="chip">{paymentMethodTypeLabel(method.type)}</span>
            <span class="row-sub">
              {#each fieldsForType(method.type) as field (field.key)}
                {#if (method.details[field.key] ?? "").trim()}
                  <span>{field.label}: {method.details[field.key]}</span>
                {/if}
              {/each}
            </span>
            {#if method.instructions}
              <span class="row-sub muted">{method.instructions}</span>
            {/if}
          </div>
          <div class="row-actions">
            <span class="state" class:on={method.isActive} class:off={!method.isActive}>
              {method.isActive ? "Activo" : "Inactivo"}
            </span>
            <button
              type="button"
              class="icon"
              onclick={() => openEdit(method)}
              disabled={rowBusy[method.id]}
              aria-label={`Editar ${method.title}`}
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="icon"
              onclick={() => toggle(method)}
              disabled={rowBusy[method.id]}
              aria-label={method.isActive ? "Desactivar" : "Activar"}
            >
              <Power size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="icon danger"
              onclick={() => askDelete(method)}
              disabled={rowBusy[method.id]}
              aria-label={`Eliminar ${method.title}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

{#if showForm}
  <div class="backdrop" onclick={closeForm} role="presentation"></div>
  <section class="modal" role="dialog" aria-modal="true" aria-labelledby="pm-form-title">
    <header class="modal-head">
      <h2 id="pm-form-title">{editingId ? "Editar método de pago" : "Nuevo método de pago"}</h2>
      <button type="button" class="icon" onclick={closeForm} aria-label="Cerrar">
        <X size={20} aria-hidden="true" />
      </button>
    </header>

    <label class="field">
      <span>Tipo</span>
      <select class="input" bind:value={formType} onchange={() => changeType(formType)}>
        {#each PAYMENT_METHOD_TYPES as info (info.id)}
          <option value={info.id}>{info.label}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Título</span>
      <input class="input" type="text" bind:value={formTitle} placeholder="Ej. Pago Móvil Banplus" />
    </label>

    {#each fieldsForType(formType) as field (field.key)}
      <label class="field">
        <span>{field.label}{field.required ? " *" : ""}</span>
        <input
          class="input"
          type="text"
          bind:value={formDetails[field.key]}
          placeholder={field.placeholder ?? ""}
        />
      </label>
    {/each}

    <label class="field">
      <span>Instrucciones (opcional)</span>
      <textarea class="input" rows="3" bind:value={formInstructions}></textarea>
    </label>

    {#if formError}
      <p class="error" role="alert">{formError}</p>
    {/if}

    <div class="modal-actions">
      <button type="button" class="ghost" onclick={closeForm} disabled={saving}>Cancelar</button>
      <button type="button" class="primary" onclick={save} disabled={saving}>
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  </section>
{/if}

{#if deleting}
  <div class="backdrop" onclick={() => (deleting = null)} role="presentation"></div>
  <section class="modal" role="alertdialog" aria-modal="true" aria-labelledby="pm-del-title">
    <h2 id="pm-del-title">¿Eliminar «{deleting.title}»?</h2>
    <p class="hint">
      Las citas que ya usaron este método conservan su comprobante y referencia.
    </p>
    {#if deleteError}
      <p class="error" role="alert">{deleteError}</p>
    {/if}
    <div class="modal-actions">
      <button type="button" class="ghost" onclick={() => (deleting = null)} disabled={deleteBusy}>
        Cancelar
      </button>
      <button type="button" class="danger" onclick={confirmDelete} disabled={deleteBusy}>
        {deleteBusy ? "Eliminando…" : "Eliminar"}
      </button>
    </div>
  </section>
{/if}

<style>
  .toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.9rem 1rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }

  .row.busy {
    opacity: 0.65;
  }

  .row-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .row-title {
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .chip {
    align-self: flex-start;
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.15rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .row-sub {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }

  .row-sub.muted {
    color: var(--text-muted);
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .state {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .state.on {
    background: var(--status-confirmed-bg);
    color: var(--accent-positive);
  }

  .state.off {
    background: var(--status-rejected-bg);
    color: var(--accent-negative);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .icon.danger {
    color: var(--accent-negative);
  }

  .icon:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .primary,
  .ghost,
  .danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-btn);
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  .primary {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .ghost {
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    border: var(--border-btn-secondary);
  }

  .danger {
    background: transparent;
    color: var(--accent-negative);
    border: 1px solid var(--accent-negative);
  }

  .primary:disabled,
  .ghost:disabled,
  .danger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem 1rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-light);
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0.5rem 0;
  }

  .error {
    color: var(--accent-negative);
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }

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
    width: min(460px, calc(100% - 2rem));
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-glow);
  }

  .modal h2 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field span {
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
</style>
