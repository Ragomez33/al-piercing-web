<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { CalendarDays, Lock, LogOut, Menu, Package, Pencil, Plus, Sparkles, Trash2, X } from "lucide-svelte";
  import {
    getActiveSession,
    onAuthStateChange,
    signInWithEmailPassword,
    signOut,
  } from "../../lib/auth";
  import { DataError, dataStore } from "../../lib/data/store";
  import { isSupabaseConfigured } from "../../lib/data/supabase-client";
  import { BRAND_LOGO } from "../../lib/config";
  import { PRODUCT_CATEGORIES, type ProductCategory } from "../../lib/types/content";
  import type { ProductRecord } from "../../lib/types/domain";
  import {
    PIERCING_SERVICE_CATEGORIES,
    type NewServiceInput,
    type PiercingService,
    type PiercingServiceCategory,
  } from "../../lib/data/services";
  import { formatCents } from "../../lib/utils/money";
  import { uploadProductImage } from "../../lib/services/storage";
  import AdminCalendar from "./AdminCalendar.svelte";

  type AdminTab = "calendar" | "catalog" | "services";
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

  // Dashboard shell (feature 010): persistent sidebar on wide screens,
  // off-canvas drawer on small screens.
  let drawerOpen = $state(false);
  let drawerEl = $state<HTMLElement | null>(null);
  let toggleEl = $state<HTMLButtonElement | null>(null);

  function openDrawer() {
    drawerOpen = true;
  }

  function closeDrawer() {
    drawerOpen = false;
    toggleEl?.focus();
  }

  function toggleDrawer() {
    if (drawerOpen) closeDrawer();
    else openDrawer();
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (drawerOpen && event.key === "Escape") closeDrawer();
  }

  // Move focus into the drawer when it opens (admin-shell-contract §3).
  $effect(() => {
    if (drawerOpen && drawerEl) {
      drawerEl.querySelector<HTMLElement>("button")?.focus();
    }
  });

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
  let createError = $state("");
  // Image upload state
  let imageFile = $state<File | null>(null);
  let imagePreview = $state<string | null>(null);
  let uploadingImage = $state(false);

  // Services state (feature 011)
  let services = $state<PiercingService[]>([]);
  let servicesLoading = $state(false);
  let servicesError = $state("");
  let svBusy = $state<Record<string, boolean>>({});

  // Service create/edit modal
  let showService = $state(false);
  let editingServiceId = $state<string | null>(null);
  let svName = $state("");
  let svCategory = $state<PiercingServiceCategory>("NOSTRIL");
  let svDescription = $state("");
  let svPrice = $state("");
  let svDuration = $state("");
  let svRequiresDeposit = $state(true);
  let serviceError = $state("");
  let savingService = $state(false);

  // Service delete confirmation
  let deletingService = $state<PiercingService | null>(null);
  let deleting = $state(false);
  let deleteError = $state("");

  function switchTab(next: AdminTab) {
    tab = next;
    drawerOpen = false;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url);
    if (next === "catalog") void refreshCatalog();
    if (next === "services") void refreshServices();
  }

  async function refreshServices() {
    try {
      servicesLoading = true;
      servicesError = "";
      services = await dataStore.listServices({ includeInactive: true });
    } catch (err) {
      servicesError = err instanceof DataError ? err.message : "Error al cargar los servicios";
    } finally {
      servicesLoading = false;
    }
  }

  function openCreateService() {
    serviceError = "";
    editingServiceId = null;
    svName = "";
    svCategory = "NOSTRIL";
    svDescription = "";
    svPrice = "";
    svDuration = "";
    svRequiresDeposit = true;
    showService = true;
  }

  function openEditService(service: PiercingService) {
    serviceError = "";
    editingServiceId = service.id;
    svName = service.name;
    svCategory = service.category;
    svDescription = service.description;
    svPrice = String(service.priceCents);
    svDuration = String(service.durationMinutes);
    svRequiresDeposit = service.requiresDeposit;
    showService = true;
  }

  function closeService() {
    showService = false;
    serviceError = "";
  }

  async function submitService() {
    const name = svName.trim();
    const priceCents = Number(svPrice);
    const durationMinutes = Number(svDuration);
    if (name.length === 0) {
      serviceError = "El nombre es obligatorio";
      return;
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      serviceError = "El precio debe ser un número entero mayor o igual a 0 (centavos)";
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      serviceError = "La duración debe ser un número entero mayor a 0 (minutos)";
      return;
    }
    const input: NewServiceInput = {
      name,
      category: svCategory,
      description: svDescription.trim(),
      priceCents,
      durationMinutes,
      requiresDeposit: svRequiresDeposit,
    };
    savingService = true;
    serviceError = "";
    try {
      if (editingServiceId) {
        await dataStore.updateService(editingServiceId, input);
      } else {
        await dataStore.createService(input);
      }
      closeService();
      await refreshServices();
    } catch (err) {
      serviceError = err instanceof DataError ? err.message : "No se pudo guardar el servicio";
    } finally {
      savingService = false;
    }
  }

  async function toggleServiceActive(service: PiercingService) {
    svBusy[service.id] = true;
    servicesError = "";
    try {
      await dataStore.updateService(service.id, { active: !service.active });
      await refreshServices();
    } catch (err) {
      servicesError = err instanceof DataError ? err.message : "No se pudo cambiar el estado";
    } finally {
      svBusy[service.id] = false;
    }
  }

  function askDeleteService(service: PiercingService) {
    deleteError = "";
    deletingService = service;
  }

  function cancelDeleteService() {
    deletingService = null;
    deleteError = "";
  }

  async function confirmDeleteService() {
    if (!deletingService) return;
    deleting = true;
    deleteError = "";
    try {
      await dataStore.deleteService(deletingService.id);
      deletingService = null;
      await refreshServices();
    } catch (err) {
      deleteError = err instanceof DataError ? err.message : "No se pudo eliminar el servicio";
    } finally {
      deleting = false;
    }
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
    else if (params.get("tab") === "services") tab = "services";
    if (status === "dashboard" && tab === "services") void refreshServices();
    unsubscribeAuth = onAuthStateChange((sessionEmail) => {
      if (sessionEmail) {
        adminEmail = sessionEmail;
        status = "dashboard";
      } else {
        status = "login";
        adminEmail = "";
        products = [];
        services = [];
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

  function clearImagePreview() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    imagePreview = null;
    imageFile = null;
  }

  function closeCreate() {
    showCreate = false;
    clearImagePreview();
  }

  function onImageChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (file && !file.type.startsWith("image/")) {
      createError = "El archivo debe ser una imagen";
      imageFile = null;
      imagePreview = null;
      return;
    }
    createError = "";
    imageFile = file;
    imagePreview = file ? URL.createObjectURL(file) : null;
  }

  async function submitCreate() {
    const name = newName.trim();
    const priceCents = Number(newPrice);
    const stock = Number(newStock);

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

    createError = "";
    try {
      // Upload the selected file (if any) and use its public URL as `image`.
      let image = "/images/products/placeholder.svg";
      if (imageFile) {
        uploadingImage = true;
        image = await uploadProductImage(imageFile);
      }
      await dataStore.createProduct({ name, category: newCategory, priceCents, stock, image });
      closeCreate();
      newName = "";
      newPrice = "";
      newStock = "";
      await refreshCatalog();
    } catch (err) {
      createError = err instanceof DataError ? err.message : "No se pudo crear el producto";
    } finally {
      uploadingImage = false;
    }
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

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
        class="input"
        id="login-email"
        type="email"
        autocomplete="username"
        bind:value={email}
        aria-invalid={!!loginError && !email}
      />

      <label class="field" for="login-password">Contraseña</label>
      <input
        class="input"
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
  <div class="shell">
    <button
      type="button"
      class="drawer-toggle"
      aria-label="Abrir navegación del panel"
      aria-expanded={drawerOpen}
      aria-controls="admin-sidebar"
      bind:this={toggleEl}
      onclick={toggleDrawer}
    >
      <Menu size={20} aria-hidden="true" />
    </button>

    {#if drawerOpen}
      <div class="drawer-backdrop" onclick={closeDrawer} role="presentation"></div>
    {/if}

    <aside
      id="admin-sidebar"
      class="sidebar"
      class:open={drawerOpen}
      aria-label="Navegación del panel"
      bind:this={drawerEl}
    >
      <div class="sidebar-top">
        <div class="brand-row">
          <img class="panel-logo" src={BRAND_LOGO} alt="ALPIERCING logo" width="32" height="32" />
          <h1>ALPIERCING Admin</h1>
        </div>

        <nav class="side-nav" aria-label="Secciones del panel">
          <button
            type="button"
            class="side-link"
            class:active={tab === "calendar"}
            aria-current={tab === "calendar" ? "page" : undefined}
            onclick={() => switchTab("calendar")}
          >
            <CalendarDays size={18} aria-hidden="true" /> Calendario
          </button>
          <button
            type="button"
            class="side-link"
            class:active={tab === "catalog"}
            aria-current={tab === "catalog" ? "page" : undefined}
            onclick={() => switchTab("catalog")}
          >
            <Package size={18} aria-hidden="true" /> Inventario
          </button>
          <button
            type="button"
            class="side-link"
            class:active={tab === "services"}
            aria-current={tab === "services" ? "page" : undefined}
            onclick={() => switchTab("services")}
          >
            <Sparkles size={18} aria-hidden="true" /> Servicios
          </button>
        </nav>
      </div>

      <div class="sidebar-bottom">
        <span class="mode-badge">Modo {mode}</span>
        <span class="admin-email" title="Sesión activa">{adminEmail}</span>
        <button type="button" class="ghost logout" onclick={logout}>
          <LogOut size={16} aria-hidden="true" /> Cerrar Sesión
        </button>
      </div>
    </aside>

    <section class="content" aria-label="Contenido del panel">
    {#if tab === "calendar"}
      <AdminCalendar />
    {:else if tab === "catalog"}
      <div class="toolbar">
        <button type="button" class="primary" onclick={() => { createError = ""; showCreate = true; }}>
          <Plus size={18} aria-hidden="true" /> Nuevo Producto
        </button>
      </div>

      {#if productsLoading}
        <p class="hint" aria-live="polite">Cargando inventario…</p>
      {:else if productsError}
        <p class="error" role="alert">{productsError}</p>
      {:else}
        <div class="inventory">
          {#if products.length === 0}
            <p class="empty-state">No hay productos en el catálogo.</p>
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
                  class="input"
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
        </div>
      {/if}
    {:else}
      <div class="toolbar">
        <button type="button" class="primary" onclick={openCreateService}>
          <Plus size={18} aria-hidden="true" /> Nuevo Servicio
        </button>
      </div>

      {#if servicesLoading}
        <p class="hint" aria-live="polite">Cargando servicios…</p>
      {:else if servicesError}
        <p class="error" role="alert">{servicesError}</p>
      {:else}
        <div class="inventory">
          {#if services.length === 0}
            <p class="empty-state">No hay servicios cargados.</p>
          {:else}
            <ul class="rows">
              {#each services as service (service.id)}
                <li class="row">
                  <div class="row-main">
                    <strong class="row-title">{service.name}</strong>
                    <span class="row-sub">{service.category} · {service.durationMinutes} min</span>
                    <span class="row-sub">{formatCents(service.priceCents)}</span>
                  </div>
                  <div class="publish">
                    <span class="sr-label">Activo</span>
                    <button
                      type="button"
                      class="toggle"
                      class:on={service.active}
                      role="switch"
                      aria-checked={service.active}
                      aria-label={`Activar o desactivar ${service.name}`}
                      disabled={svBusy[service.id]}
                      onclick={() => void toggleServiceActive(service)}
                    >
                      <span class="knob" aria-hidden="true"></span>
                    </button>
                    {#if !service.active}
                      <span class="chip-hidden">Inactivo</span>
                    {/if}
                  </div>
                  <div class="row-actions">
                    <button type="button" class="ghost small" onclick={() => openEditService(service)}>
                      <Pencil size={16} aria-hidden="true" /> Editar
                    </button>
                    <button type="button" class="danger small" onclick={() => askDeleteService(service)}>
                      <Trash2 size={16} aria-hidden="true" /> Eliminar
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    {/if}
    </section>
  </div>

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
        <input class="input" id="np-name" type="text" bind:value={newName} required />

        <label class="field" for="np-category">Categoría</label>
        <select class="input" id="np-category" bind:value={newCategory}>
          {#each PRODUCT_CATEGORIES as category (category)}
            <option value={category}>{category}</option>
          {/each}
        </select>

        <label class="field" for="np-price">Precio (centavos)</label>
        <input class="input" id="np-price" type="number" min="0" step="1" inputmode="numeric" bind:value={newPrice} required />

        <label class="field" for="np-stock">Stock</label>
        <input class="input" id="np-stock" type="number" min="0" step="1" inputmode="numeric" bind:value={newStock} required />

        <label class="field" for="np-image">Imagen</label>
        <input
          class="input file-input"
          id="np-image"
          type="file"
          accept="image/*"
          onchange={onImageChange}
        />
        {#if imagePreview}
          <div class="image-preview">
            <img src={imagePreview} alt="Vista previa de la imagen seleccionada" />
          </div>
        {/if}

        {#if createError}
          <p class="error" role="alert">{createError}</p>
        {/if}

        <div class="modal-actions">
          <button type="button" class="ghost" onclick={closeCreate} disabled={uploadingImage}>
            Cancelar
          </button>
          <button type="submit" class="primary" disabled={uploadingImage}>
            {uploadingImage ? "Subiendo imagen…" : "Crear Producto"}
          </button>
        </div>
      </form>
    </section>
  {/if}

  {#if showService}
    <div class="backdrop" onclick={closeService} role="presentation"></div>
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="service-title">
      <header class="modal-head">
        <h2 id="service-title">{editingServiceId ? "Editar Servicio" : "Nuevo Servicio"}</h2>
        <button type="button" class="icon-btn" onclick={closeService} aria-label="Cerrar">
          <X size={20} />
        </button>
      </header>

      <form onsubmit={(e) => { e.preventDefault(); void submitService(); }}>
        <label class="field" for="sv-name">Nombre</label>
        <input class="input" id="sv-name" type="text" bind:value={svName} required />

        <label class="field" for="sv-category">Categoría</label>
        <select class="input" id="sv-category" bind:value={svCategory}>
          {#each PIERCING_SERVICE_CATEGORIES as category (category.id)}
            <option value={category.id}>{category.label}</option>
          {/each}
        </select>

        <label class="field" for="sv-description">Descripción</label>
        <textarea class="input" id="sv-description" rows="3" bind:value={svDescription}></textarea>

        <label class="field" for="sv-price">Precio (centavos)</label>
        <input class="input" id="sv-price" type="number" min="0" step="1" inputmode="numeric" bind:value={svPrice} required />
        <p class="field-hint">100 centavos = $1.00</p>

        <label class="field" for="sv-duration">Duración (min)</label>
        <input class="input" id="sv-duration" type="number" min="1" step="1" inputmode="numeric" bind:value={svDuration} required />

        <label class="checkbox-field">
          <input type="checkbox" bind:checked={svRequiresDeposit} />
          <span>Requiere seña</span>
        </label>

        {#if serviceError}
          <p class="error" role="alert">{serviceError}</p>
        {/if}

        <div class="modal-actions">
          <button type="button" class="ghost" onclick={closeService} disabled={savingService}>
            Cancelar
          </button>
          <button type="submit" class="primary" disabled={savingService}>
            {savingService ? "Guardando…" : editingServiceId ? "Guardar Cambios" : "Crear Servicio"}
          </button>
        </div>
      </form>
    </section>
  {/if}

  {#if deletingService}
    <div class="backdrop" onclick={cancelDeleteService} role="presentation"></div>
    <section class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-service-title">
      <header class="modal-head">
        <h2 id="delete-service-title">Eliminar servicio</h2>
        <button type="button" class="icon-btn" onclick={cancelDeleteService} aria-label="Cerrar">
          <X size={20} />
        </button>
      </header>
      <p class="gate-hint">
        ¿Eliminar <strong>{deletingService.name}</strong>? Las reservas existentes conservan el nombre y
        el precio guardados.
      </p>
      {#if deleteError}
        <p class="error" role="alert">{deleteError}</p>
      {/if}
      <div class="modal-actions">
        <button type="button" class="ghost" onclick={cancelDeleteService} disabled={deleting}>Cancelar</button>
        <button type="button" class="danger" onclick={() => void confirmDeleteService()} disabled={deleting}>
          {deleting ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </section>
  {/if}
{/if}

<style>
  .gate {
    max-width: 420px;
    margin: 0 auto;
    padding: 2rem 1.25rem;
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

  /* Dashboard shell (feature 010): sidebar + main content area. */
  .shell {
    display: flex;
    align-items: flex-start;
    min-height: 100vh;
    width: 100%;
  }

  .sidebar {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    width: 256px;
    flex: 0 0 256px;
    height: 100vh;
    padding: 1.5rem;
    background: var(--bg-app-body);
    border-right: 1px solid var(--divider-subtle);
  }

  .sidebar-top {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .sidebar-bottom {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    border-top: 1px solid var(--divider-subtle);
    padding-top: 1rem;
  }

  .side-nav {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .side-link {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 44px;
    padding: 0.55rem 0.85rem;
    border-radius: var(--radius-btn);
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.95rem;
    text-align: left;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease;
  }

  .side-link:hover {
    color: var(--text-gold);
    background: var(--bg-pill-hover);
  }

  .side-link:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .side-link.active {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .content {
    flex: 1 1 auto;
    min-width: 0;
    padding: 2.5rem 3rem;
  }

  /* Drawer toggle: hidden until the sidebar becomes off-canvas. */
  .drawer-toggle {
    display: none;
    position: fixed;
    top: 0.75rem;
    left: 0.75rem;
    z-index: var(--z-overlay);
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .drawer-toggle:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: var(--overlay-backdrop);
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .panel-logo {
    height: 32px;
    width: auto;
    object-fit: contain;
  }

  h1 {
    margin: 0;
    font-size: 1.6rem;
    color: var(--text-primary);
  }

  .logout {
    width: 100%;
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

  /* Small screens: the sidebar becomes an off-canvas drawer. */
  @media (max-width: 767px) {
    .shell {
      display: block;
      min-height: auto;
    }

    .drawer-toggle {
      display: inline-flex;
    }

    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: var(--z-modal);
      transform: translateX(-100%);
      /* Hidden from view AND from the tab order while off-canvas. */
      visibility: hidden;
      transition: transform 200ms ease, visibility 200ms ease;
      box-shadow: var(--shadow-card);
    }

    .sidebar.open {
      transform: translateX(0);
      visibility: visible;
    }

    .content {
      padding: 4.5rem 1.25rem 2rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar,
    .side-link {
      transition: none;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  /* Inventory shell: keeps a fixed minimum height so the footer stays at the
     bottom even when the catalog is empty or has few products. */
  .inventory {
    min-height: 50vh;
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    color: var(--text-muted);
    font-size: 1.05rem;
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
    border-radius: var(--radius-btn);
    font-weight: 600;
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
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
  }

  .primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ghost {
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    border: var(--border-btn-secondary);
    text-decoration: none;
    transition: border-color 160ms ease;
  }

  .ghost:hover {
    border: var(--border-btn-secondary-hover);
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

  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .danger {
    background: var(--accent-negative);
    color: var(--accent-on);
  }

  .field-hint {
    margin: -0.5rem 0 0;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-weight: 600;
    min-height: 44px;
  }

  .checkbox-field input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent-primary);
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

  /* File picker styled to match the Dark Luxury control skin. */
  .file-input {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
  }

  .file-input::file-selector-button {
    margin-right: 0.75rem;
    padding: 0.35rem 0.85rem;
    border: none;
    border-radius: var(--radius-btn);
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 160ms ease;
  }

  .file-input::file-selector-button:hover {
    background: var(--accent-primary-hover);
  }

  .image-preview {
    display: flex;
    justify-content: center;
    padding: 0.5rem;
    border: var(--border-card);
    border-radius: var(--radius-image);
    background: var(--bg-control);
  }

  .image-preview img {
    max-width: 100%;
    max-height: 160px;
    border-radius: var(--radius-image);
    object-fit: contain;
  }

  .ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>