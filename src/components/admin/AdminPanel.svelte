<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Lock, LogOut, Plus, X } from "lucide-svelte";
  import {
    getActiveSession,
    onAuthStateChange,
    signInWithEmailPassword,
    signOut,
  } from "../../lib/auth";
  import { DataError, dataStore } from "../../lib/data/store";
  import { isSupabaseConfigured } from "../../lib/data/supabase-client";
  import { PRODUCT_CATEGORIES, type ProductCategory } from "../../lib/types/content";
  import type { ProductRecord } from "../../lib/types/domain";
  import { formatCents } from "../../lib/utils/money";
  import AdminCalendar from "./AdminCalendar.svelte";

  type AdminTab = "calendar" | "catalog";
  type GateStatus = "checking" | "notice" | "login" | "dashboard";

  let status = $state<GateStatus>("checking");
  let adminEmail = $state("");

  // Login form
  let email = $state("");
  let password = $state("");
  let loginError = $state("");
  let signingIn = $state(false);

  let tab = $state<AdminTab>("calendar");
  let mode = $state(dataStore.mode);

  // Products state (catalog tab)
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
    if (next === "catalog") void refreshCatalog();
  }

  async function refreshCatalog() {
    try {
      productsLoading = true;
      productsError = "";
      products = await dataStore.listProducts({ includeUnpublished: true });
    } catch (err) {
      productsError = err instanceof DataError ? err.message : "Error al cargar el inventario";
    } finally {
      productsLoading = false;
    }
  }

  // --- Auth gate (feature 005) ---
  async function submitLogin(event: SubmitEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value || !password) {
      loginError = "Completá email y contraseña";
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      loginError = "Ingresá un email válido";
      return;
    }
    signingIn = true;
    loginError = "";
    try {
      const session = await signInWithEmailPassword(value, password);
      adminEmail = session.email;
      status = "dashboard";
      email = "";
      password = "";
    } catch (err) {
      loginError = err instanceof DataError ? err.message : "Error de autenticación";
    } finally {
      signingIn = false;
    }
  }

  async function logout() {
    try {
      await signOut();
    } catch {
      // onAuthStateChange still flips to login.
    }
  }

  let unsubscribeAuth: (() => void) | null = null;

  onMount(async () => {
    if (!isSupabaseConfigured()) {
      status = "notice";
      return;
    }
    const session = await getActiveSession();
    if (session) {
      adminEmail = session.email;
      status = "dashboard";
    } else {
      status = "login";
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "catalog") tab = "catalog";
    unsubscribeAuth = onAuthStateChange((sessionEmail) => {
      if (sessionEmail) {
        adminEmail = sessionEmail;
        status = "dashboard";
      } else {
        status = "login";
        adminEmail = "";
        products = [];
      }
    });
  });

  onDestroy(() => {
    unsubscribeAuth?.();
  });

  // --- Catalog actions (feature 004) ---
  async function saveStock(product: ProductRecord) {
    const next = stockDraft[product.id];
    if (next === undefined || !Number.isInteger(next) || next < 0) return;
    saving[product.id] = true;
    try {
      await dataStore.updateProduct(product.id, { stock: next });
      delete stockDraft[product.id];
      await refreshCatalog();
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
      await refreshCatalog();
    } catch (err) {
      productsError = err instanceof DataError ? err.message : "No se pudo cambiar el estado";
    } finally {
      saving[product.id] = false;
    }
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
      await refreshCatalog();
    } catch (err) {
      createError = err instanceof DataError ? err.message : "No se pudo crear el producto";
    }
  }
</script>

{#if status === "checking"}
  <section class="gate">
    <p class="hint" aria-live="polite">Verificando sesión…</p>
  </section>
{:else if status === "notice"}
  <section class="gate" role="alert">
    <h2>Panel requiere configuración</h2>
    <p class="gate-hint">
      La administración necesita Supabase configurado
      (<code>PUBLIC_SUPABASE_URL</code> + <code>PUBLIC_SUPABASE_ANON_KEY</code>).
    </p>
    <a class="ghost" href="/">← Volver al inicio</a>
  </section>
{:else if status === "login"}
  <section class="gate login" aria-labelledby="login-title">
    <span class="login-icon" aria-hidden="true"><Lock size={22} /></span>
    <h2 id="login-title">Panel protegido</h2>
    <p class="gate-hint">Ingresá con el usuario del estudio.</p>

    <form onsubmit={submitLogin}>
      <label class="field" for="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        autocomplete="username"
        bind:value={email}
        aria-invalid={!!loginError && !email}
      />

      <label class="field" for="login-password">Contraseña</label>
      <input
        id="login-password"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        aria-invalid={!!loginError && !password}
      />

      {#if loginError}
        <p class="error" id="login-error" role="alert">{loginError}</p>
      {/if}

      <button type="submit" class="primary" disabled={signingIn}>
        {signingIn ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  </section>
{:else}
  <section class="panel" aria-label="Panel de administración">
    <header class="panel-head">
      <h1>Panel del Estudio</h1>
      <div class="head-actions">
        <span class="mode-badge">Modo {mode}</span>
        <span class="admin-email" title="Sesión activa">{adminEmail}</span>
        <button type="button" class="ghost" onclick={logout}>
          <LogOut size={16} aria-hidden="true" /> Cerrar Sesión
        </button>
      </div>
    </header>

    <nav class="tabs" aria-label="Secciones del panel">
      <button
        type="button"
        class="tab"
        class:active={tab === "calendar"}
        aria-pressed={tab === "calendar"}
        onclick={() => switchTab("calendar")}
      >
        Calendario
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

    {#if tab === "calendar"}
      <AdminCalendar />
    {:else}
      <div class="toolbar">
        <button type="button" class="primary" onclick={() => { createError = ""; showCreate = true; }}>
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
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.25rem;
  }

  .gate {
    max-width: 420px;
    text-align: center;
  }

  .login {
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-glow);
    padding: 1.5rem;
    margin-top: 2rem;
  }

  .login-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
    margin-bottom: 0.75rem;
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
    text-align: left;
  }

  code {
    font-family: ui-monospace, monospace;
    color: var(--text-gold);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
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
  .icon-btn:focus-visible,
  .ghost:focus-visible {
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
    flex-wrap: wrap;
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

  .admin-email {
    color: var(--text-secondary);
    font-size: 0.85rem;
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

  .primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ghost {
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    border: var(--border-card);
    text-decoration: none;
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