<script lang="ts">
  import { onMount } from "svelte";
  import { Lock, Plus, X } from "lucide-svelte";
  import { ADMIN_PIN } from "../../lib/config";
  import { DataError, dataStore } from "../../lib/data/store";
  import { PRODUCT_CATEGORIES, type ProductCategory } from "../../lib/types/content";
  import type { Booking, BookingStatus, ProductRecord } from "../../lib/types/domain";
  import { formatCents } from "../../lib/utils/money";

  type AdminTab = "bookings" | "catalog";

  let unlocked = $state(false);
  let pin = $state("");
  let pinError = $state("");
  let tab = $state<AdminTab>("bookings");

  let mode = $state(dataStore.mode);

  // Bookings state
  let bookings = $state<Booking[]>([]);
  let bookingsLoading = $state(false);
  let bookingsError = $state("");
  let filterDate = $state("");
  let busy = $state<Record<string, boolean>>({});

  // Products state
  let products = $state<ProductRecord[]>([]);
  let productsLoading = $state(false);
  let productsError = $state("");
  let stockDraft = $state<Record<string, number>>({});
  let saving = $state<Record<string, boolean>>({});

  // Add-product modal state
  let showCreate = $state(false);
  let newName = $state("");
  let newCategory = $state<ProductCategory>("Argollas & Labrets");
  let newPrice = $state("");
  let newStock = $state("");
  let newImage = $state("");
  let createError = $state("");

  function switchTab(next: AdminTab) {
    tab = next;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url);
    void refresh();
  }

  async function refresh() {
    try {
      if (tab === "bookings") {
        bookingsLoading = true;
        bookingsError = "";
        bookings = await dataStore.listBookings(filterDate ? { date: filterDate } : undefined);
      } else {
        productsLoading = true;
        productsError = "";
        products = await dataStore.listProducts({ includeUnpublished: true });
      }
    } catch (err) {
      const message = err instanceof DataError ? err.message : "Error al cargar los datos";
      if (tab === "bookings") bookingsError = message;
      else productsError = message;
    } finally {
      bookingsLoading = false;
      productsLoading = false;
    }
  }

  // --- PIN gate ---
  function unlock() {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("alpi:admin:unlocked", "1");
      unlocked = true;
      pinError = "";
      pin = "";
      void refresh();
    } else {
      pinError = "PIN incorrecto";
    }
  }

  function lock() {
    sessionStorage.removeItem("alpi:admin:unlocked");
    unlocked = false;
    bookings = [];
    products = [];
  }

  // --- Bookings actions (US1) ---
  async function setStatus(bookingId: string, status: BookingStatus) {
    busy[bookingId] = true;
    try {
      await dataStore.updateBookingStatus(bookingId, status);
      await refresh();
    } catch (err) {
      bookingsError = err instanceof DataError ? err.message : "No se pudo actualizar la cita";
    } finally {
      busy[bookingId] = false;
    }
  }

  // --- Catalog actions (US3) ---
  async function saveStock(product: ProductRecord) {
    const next = stockDraft[product.id];
    if (next === undefined || !Number.isInteger(next) || next < 0) return;
    saving[product.id] = true;
    try {
      products = await dataStore.updateProduct(product.id, { stock: next });
      delete stockDraft[product.id];
      await refresh();
    } catch (err) {
      productsError = err instanceof DataError ? err.message : "No se pudo guardar el stock";
    } finally {
      saving[product.id] = false;
    }
  }

  async function togglePublished(product: ProductRecord) {
    saving[product.id] = true;
    try {
      await dataStore.updateProduct(product.id, { published: !product.published });
      await refresh();
    } catch (err) {
      productsError = err instanceof DataError ? err.message : "No se pudo cambiar el estado";
    } finally {
      saving[product.id] = false;
    }
  }

  function openCreate() {
    createError = "";
    showCreate = true;
  }

  function closeCreate() {
    showCreate = false;
  }

  async function submitCreate() {
    const name = newName.trim();
    const priceCents = Number(newPrice);
    const stock = Number(newStock);
    const image = newImage.trim() || "/images/products/placeholder.svg";

    if (name.length === 0) {
      createError = "El nombre es obligatorio";
      return;
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      createError = "El precio debe ser un número entero mayor o igual a 0 (centavos)";
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      createError = "El stock debe ser un número entero mayor o igual a 0";
      return;
    }

    try {
      await dataStore.createProduct({ name, category: newCategory, priceCents, stock, image });
      closeCreate();
      newName = "";
      newPrice = "";
      newStock = "";
      newImage = "";
      await refresh();
    } catch (err) {
      createError = err instanceof DataError ? err.message : "No se pudo crear el producto";
    }
  }

  onMount(() => {
    unlocked = sessionStorage.getItem("alpi:admin:unlocked") === "1";
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "catalog") tab = "catalog";
    if (unlocked) void refresh();
  });
</script>

{#if !unlocked}
  <section class="gate" aria-labelledby="gate-title">
    <h2 id="gate-title">Panel protegido</h2>
    <p class="gate-hint">Ingresá el PIN para gestionar citas y catálogo.</p>
    <form onsubmit={(e) => { e.preventDefault(); unlock(); }}>
      <label class="field" for="admin-pin">PIN de acceso</label>
      <input
        id="admin-pin"
        type="password"
        inputmode="numeric"
        autocomplete="current-password"
        placeholder="••••"
        bind:value={pin}
        aria-invalid={!!pinError}
        aria-describedby="pin-error"
      />
      {#if pinError}
        <p class="error" id="pin-error" role="alert">{pinError}</p>
      {/if}
      <button type="submit" class="primary">Desbloquear</button>
    </form>
  </section>
{:else}
  <section class="panel" aria-label="Panel de administración">
    <header class="panel-head">
      <h1>Panel del Estudio</h1>
      <div class="head-actions">
        <span class="mode-badge">Modo {mode}</span>
        <button type="button" class="ghost" onclick={lock}>Bloquear</button>
      </div>
    </header>

    <nav class="tabs" aria-label="Secciones del panel">
      <button
        type="button"
        class="tab"
        class:active={tab === "bookings"}
        aria-pressed={tab === "bookings"}
        onclick={() => switchTab("bookings")}
      >
        Agenda y Citas
      </button>
      <button
        type="button"
        class="tab"
        class:active={tab === "catalog"}
        aria-pressed={tab === "catalog"}
        onclick={() => switchTab("catalog")}
      >
        Inventario
      </button>
    </nav>

    {#if tab === "bookings"}
      <div class="toolbar">
        <label class="field field-inline" for="filter-date">
          Agenda por fecha
          <input id="filter-date" type="date" bind:value={filterDate} onchange={() => void refresh()} />
        </label>
        {#if filterDate}
          <button type="button" class="ghost" onclick={() => { filterDate = ""; void refresh(); }}>
            Limpiar filtro
          </button>
        {/if}
      </div>

      {#if bookingsLoading}
        <p class="hint" aria-live="polite">Cargando citas…</p>
      {:else if bookingsError}
        <p class="error" role="alert">{bookingsError}</p>
      {:else if bookings.length === 0}
        <p class="empty">No hay citas para esta vista.</p>
      {:else}
        <ul class="rows">
          {#each bookings as booking (booking.id)}
            <li class="row">
              <div class="row-main">
                <strong class="row-title">{booking.clientName}</strong>
                <span class="row-sub">{booking.clientWhatsapp}</span>
                <span class="row-sub">{booking.serviceName}</span>
              </div>
              <div class="row-meta">
                <span class="when">{booking.date} · {booking.timeSlot}</span>
                <span class="amount">{formatCents(booking.depositCents)}</span>
              </div>
              <span class="badge badge-{booking.status.toLowerCase()}">{booking.status}</span>
              <div class="row-actions">
                {#if booking.status === "PENDING"}
                  <button
                    type="button"
                    class="primary small"
                    disabled={busy[booking.id]}
                    onclick={() => setStatus(booking.id, "CONFIRMED")}
                  >
                    Confirmar Cita
                  </button>
                {/if}
                {#if booking.status !== "CANCELLED"}
                  <button
                    type="button"
                    class="danger small"
                    disabled={busy[booking.id]}
                    onclick={() => setStatus(booking.id, "CANCELLED")}
                  >
                    Cancelar
                  </button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <div class="toolbar">
        <button type="button" class="primary" onclick={openCreate}>
          <Plus size={18} aria-hidden="true" /> Nuevo Producto
        </button>
      </div>

      {#if productsLoading}
        <p class="hint" aria-live="polite">Cargando inventario…</p>
      {:else if productsError}
        <p class="error" role="alert">{productsError}</p>
      {:else if products.length === 0}
        <p class="empty">No hay productos en el catálogo.</p>
      {:else}
        <ul class="rows rows-products">
          {#each products as product (product.id)}
            <li class="row">
              <img
                class="thumb"
                src={product.image}
                alt=""
                loading="lazy"
                data-fallback="/images/products/placeholder.svg"
              />
              <div class="row-main">
                <strong class="row-title">{product.name}</strong>
                <span class="row-sub">{product.category}</span>
                <span class="row-sub">{formatCents(product.priceCents)}</span>
              </div>
              <div class="stock-edit">
                <label class="sr-label" for={`stock-${product.id}`}>Stock</label>
                <input
                  id={`stock-${product.id}`}
                  type="number"
                  min="0"
                  inputmode="numeric"
                  value={stockDraft[product.id] ?? product.stock}
                  oninput={(e) => (stockDraft[product.id] = Number(e.currentTarget.value))}
                />
                <button
                  type="button"
                  class="primary small"
                  disabled={saving[product.id] || !(stockDraft[product.id] !== undefined && stockDraft[product.id] !== product.stock)}
                  onclick={() => void saveStock(product)}
                >
                  Guardar
                </button>
              </div>
              <div class="publish">
                <span class="sr-label">Publicado</span>
                <button
                  type="button"
                  class="toggle"
                  class:on={product.published}
                  role="switch"
                  aria-checked={product.published}
                  aria-label={`Publicar u ocultar ${product.name}`}
                  disabled={saving[product.id]}
                  onclick={() => togglePublished(product)}
                >
                  <span class="knob" aria-hidden="true"></span>
                </button>
                {#if !product.published}
                  <span class="chip-hidden">Oculto</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>

  {#if showCreate}
    <div class="backdrop" onclick={closeCreate} role="presentation"></div>
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <header class="modal-head">
        <h2 id="create-title">Nuevo Producto</h2>
        <button type="button" class="icon-btn" onclick={closeCreate} aria-label="Cerrar">
          <X size={20} />
        </button>
      </header>

      <form onsubmit={(e) => { e.preventDefault(); void submitCreate(); }}>
        <label class="field" for="np-name">Nombre</label>
        <input id="np-name" type="text" bind:value={newName} required />

        <label class="field" for="np-category">Categoría</label>
        <select id="np-category" bind:value={newCategory}>
          {#each PRODUCT_CATEGORIES as category (category)}
            <option value={category}>{category}</option>
          {/each}
        </select>

        <label class="field" for="np-price">Precio (centavos)</label>
        <input id="np-price" type="number" min="0" step="1" inputmode="numeric" bind:value={newPrice} required />

        <label class="field" for="np-stock">Stock</label>
        <input id="np-stock" type="number" min="0" step="1" inputmode="numeric" bind:value={newStock} required />

        <label class="field" for="np-image">Imagen (ruta/URL)</label>
        <input id="np-image" type="text" bind:value={newImage} placeholder="/images/products/placeholder.svg" />

        {#if createError}
          <p class="error" role="alert">{createError}</p>
        {/if}

        <div class="modal-actions">
          <button type="button" class="ghost" onclick={closeCreate}>Cancelar</button>
          <button type="submit" class="primary">Crear Producto</button>
        </div>
      </form>
    </section>
  {/if}
{/if}

<style>
  .gate,
  .panel {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.25rem;
  }

  .gate {
    max-width: 420px;
    text-align: center;
  }

  h2 {
    margin: 0 0 0.5rem;
    color: var(--text-primary);
  }

  .gate-hint,
  .hint,
  .empty {
    color: var(--text-muted);
  }

  .gate form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .field-inline {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .field input,
  .field select {
    font: inherit;
    color: var(--text-primary);
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    border-radius: var(--radius-image);
    padding: 0.7rem 0.85rem;
    min-height: 48px;
  }

  .field input:focus-visible,
  .field select:focus-visible,
  .icon-btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 1px;
  }

  .error {
    color: var(--accent-negative);
    font-size: 0.9rem;
    margin: 0.25rem 0 0;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }

  h1 {
    margin: 0;
    font-size: 1.9rem;
    color: var(--text-primary);
  }

  .head-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mode-badge {
    background: var(--bg-wood-pill);
    color: var(--accent-wood);
    border: 1px solid var(--border-card);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.35rem 0.8rem;
    border-radius: var(--radius-pill);
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .tab {
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-weight: 600;
    cursor: pointer;
  }

  .tab.active {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .primary,
  .ghost,
  .danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-pill);
    font-weight: 700;
    cursor: pointer;
    border: none;
  }

  .small {
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.4rem 0.9rem;
  }

  .primary {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .primary:disabled,
  .danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ghost {
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    border: var(--border-card);
  }

  .danger {
    background: transparent;
    color: var(--accent-negative);
    border: 1px solid var(--accent-negative);
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
    align-items: center;
    gap: 1rem;
    padding: 0.85rem 1rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    flex-wrap: wrap;
  }

  .row-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 180px;
    flex: 1;
  }

  .row-title {
    color: var(--text-primary);
  }

  .row-sub {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .row-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    align-items: flex-end;
  }

  .when {
    color: var(--text-muted);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .amount {
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .badge {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.8rem;
    border-radius: var(--radius-pill);
  }

  .badge-pending {
    background: var(--bg-wood-pill);
    color: var(--accent-gold);
  }

  .badge-confirmed {
    background: var(--accent-positive-tint);
    color: var(--accent-positive);
  }

  .badge-cancelled {
    background: var(--accent-negative-tint);
    color: var(--accent-negative);
  }

  .row-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .thumb {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-image);
    object-fit: cover;
    background: var(--bg-surface-elevated);
  }

  .stock-edit {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .stock-edit input {
    width: 76px;
    font: inherit;
    color: var(--text-primary);
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    border-radius: var(--radius-image);
    padding: 0.45rem 0.6rem;
    min-height: 40px;
  }

  .publish {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle {
    position: relative;
    width: 52px;
    height: 30px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-surface-elevated);
    cursor: pointer;
    padding: 0;
  }

  .toggle .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: transform 160ms ease, background-color 160ms ease;
  }

  .toggle.on {
    background: var(--accent-primary);
    box-shadow: var(--shadow-glow);
  }

  .toggle.on .knob {
    transform: translateX(22px);
    background: var(--accent-on);
  }

  .chip-hidden {
    background: var(--bg-badge-pill);
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .sr-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
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
    width: min(480px, calc(100% - 2rem));
    max-height: calc(100vh - 2rem);
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

  .modal form {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>