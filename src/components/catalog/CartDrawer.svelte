<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-svelte";
  import {
    addToCart,
    buildWhatsAppLink,
    cart,
    clearCart,
    formatCents,
    itemCount,
    removeFromCart,
    totalCents,
    updateQuantity,
  } from "../../stores/cart";
  import { PAYMENT_METHODS, type PaymentMethod } from "../../lib/types/content";
  import { WHATSAPP_PHONE } from "../../lib/config";
  import { dataStore } from "../../lib/data/store";

  // The ONLY interactive island on the catalog page (client:load).
  let open = $state(false);
  let paymentMethod = $state<PaymentMethod>("pago_movil");
  let drawerEl = $state<HTMLElement | null>(null);
  let fabEl = $state<HTMLButtonElement | null>(null);
  let backdropEl = $state<HTMLElement | null>(null);

  function filterBy(category: string) {
    document.querySelectorAll<HTMLButtonElement>("button[data-category]").forEach((btn) => {
      const isActive = btn.getAttribute("data-category") === category;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelectorAll<HTMLElement>("article[data-category]").forEach((card) => {
      const cat = card.getAttribute("data-category");
      card.classList.toggle("is-hidden", category !== "all" && cat !== category);
    });
  }

  async function onDocClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;

    const addBtn = target?.closest<HTMLElement>("[data-add-to-cart]");
    if (addBtn) {
      const id = addBtn.getAttribute("data-add-to-cart");
      if (!id) return;
      try {
        const products = await dataStore.listProducts({ includeUnpublished: false });
        const product = products.find((record) => record.id === id);
        if (product && product.stock > 0) addToCart(product);
      } catch (err) {
        // Keep the grid usable; a failing lookup must never throw to the user.
        void err;
      }
      return;
    }

    const pill = target?.closest<HTMLButtonElement>("button[data-category]");
    if (pill) {
      const category = pill.getAttribute("data-category") ?? "all";
      filterBy(category);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      open = false;
      fabEl?.focus();
    }
  }

  function openDrawer() {
    open = true;
    requestAnimationFrame(() => drawerEl?.focus());
  }

  function closeDrawer() {
    open = false;
    fabEl?.focus();
  }

  function onBackdrop(event: MouseEvent) {
    if (event.target === backdropEl) closeDrawer();
  }

  function checkout() {
    const link = buildWhatsAppLink({
      phone: WHATSAPP_PHONE,
      items: get(cart),
      paymentMethod,
    });
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  onMount(() => {
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeydown);
    };
  });
</script>

<button
  type="button"
  class="fab"
  bind:this={fabEl}
  onclick={openDrawer}
  aria-label="Abrir carrito"
>
  <ShoppingCart size={24} stroke-width={2.2} />
  {#if $itemCount > 0}
    <span class="badge" aria-live="polite">{$itemCount}</span>
  {/if}
</button>

{#if open}
  <div class="backdrop" bind:this={backdropEl} onclick={onBackdrop} role="presentation"></div>

  <aside
    class="drawer"
    role="dialog"
    aria-modal="false"
    aria-label="Carrito de compras"
    tabindex="-1"
    bind:this={drawerEl}
  >
    <header class="drawer-head">
      <h2>Tu carrito</h2>
      <button type="button" class="icon-btn" onclick={closeDrawer} aria-label="Cerrar carrito">
        <X size={20} />
      </button>
    </header>

    <div class="drawer-inner">
      {#if $cart.length === 0}
        <p class="empty">Tu carrito está vacío.</p>
      {:else}
        <ul class="lines">
          {#each $cart as item (item.product.id)}
            <li class="line">
              <img
                src={item.product.image}
                alt=""
                data-fallback="/images/products/placeholder.svg"
              />
              <div class="line-info">
                <span class="line-name">{item.product.name}</span>
                <span class="line-price">{formatCents(item.product.priceCents)}</span>
                <div class="qty">
                  <button
                    type="button"
                    class="qty-btn"
                    onclick={() => updateQuantity(item.product.id, -1)}
                    aria-label={`Disminuir cantidad de ${item.product.name}`}
                  >
                    <Minus size={16} />
                  </button>
                  <span class="qty-num">{item.quantity}</span>
                  <button
                    type="button"
                    class="qty-btn"
                    onclick={() => updateQuantity(item.product.id, 1)}
                    aria-label={`Aumentar cantidad de ${item.product.name}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="icon-btn remove"
                onclick={() => removeFromCart(item.product.id)}
                aria-label={`Quitar ${item.product.name} del carrito`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          {/each}
        </ul>

        <div class="totals" aria-live="polite">
          <span>Total ({$itemCount} ítems)</span>
          <strong class="amount">{formatCents($totalCents)}</strong>
        </div>

        <fieldset class="pay">
          <legend>Método de pago de preferencia</legend>
          <div class="pay-options">
            {#each PAYMENT_METHODS as m (m.value)}
              <button
                type="button"
                class="pay-opt"
                class:active={paymentMethod === m.value}
                onclick={() => (paymentMethod = m.value)}
                aria-pressed={paymentMethod === m.value}
              >
                {m.label}
              </button>
            {/each}
          </div>
        </fieldset>

        <button
          type="button"
          class="checkout"
          disabled={$cart.length === 0}
          onclick={checkout}
        >
          Enviar Pedido por WhatsApp
        </button>
        <button type="button" class="clear" onclick={clearCart}>Vaciar carrito</button>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .fab {
    position: fixed;
    right: 1.25rem;
    bottom: 1.25rem;
    z-index: 40;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-pill);
    background: var(--accent-primary);
    color: var(--accent-on);
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .fab:hover,
  .fab:focus-visible {
    transform: translateY(-2px);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: var(--radius-pill);
    background: var(--accent-negative);
    color: var(--text-primary);
    font-size: 0.78rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 41;
    background: var(--overlay-backdrop);
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 42;
    width: min(420px, 100%);
    background: var(--bg-card-light);
    border-left: var(--border-card);
    display: flex;
    flex-direction: column;
    outline: none;
  }

  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    border-bottom: var(--border-card);
  }

  .drawer-head h2 {
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

  .icon-btn:hover,
  .icon-btn:focus-visible {
    color: var(--accent-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .drawer-inner {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty {
    margin: 0;
    color: var(--text-secondary);
    text-align: center;
    padding: 2rem 0;
  }

  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .line {
    display: grid;
    grid-template-columns: 56px 1fr auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
  }

  .line img {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-image);
    object-fit: cover;
    background: var(--bg-surface-elevated);
  }

  .line-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .line-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .line-price {
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }

  .qty {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .qty-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--accent-primary);
    cursor: pointer;
  }

  .qty-btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .qty-num {
    min-width: 1.5rem;
    text-align: center;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
  }

  .remove {
    color: var(--accent-negative);
  }

  .totals {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 1rem 0.25rem;
  }

  .totals span {
    color: var(--text-secondary);
  }

  .amount {
    font-size: 1.4rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
  }

  .pay {
    border: none;
    padding: 0;
    margin: 0;
  }

  .pay legend {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .pay-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pay-opt {
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-btn);
    border: var(--border-btn-secondary);
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    font-weight: 600;
    cursor: pointer;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .pay-opt:hover,
  .pay-opt:focus-visible {
    border: var(--border-btn-secondary-hover);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .pay-opt.active {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .pay-opt.active:hover {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
  }

  .checkout {
    min-height: 50px;
    border-radius: var(--radius-btn);
    border: none;
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .checkout:hover:not(:disabled),
  .checkout:focus-visible {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .checkout:disabled {
    background: var(--bg-badge-pill);
    color: var(--text-muted);
    box-shadow: none;
    cursor: not-allowed;
  }

  .clear {
    min-height: 44px;
    border-radius: var(--radius-btn);
    border: var(--border-btn-secondary);
    background: var(--bg-btn-secondary);
    color: var(--accent-negative);
    font-weight: 600;
    cursor: pointer;
    transition: border-color 160ms ease;
  }

  .clear:hover,
  .clear:focus-visible {
    border: var(--border-btn-secondary-hover);
    outline: 2px solid var(--accent-negative);
    outline-offset: 2px;
  }
</style>