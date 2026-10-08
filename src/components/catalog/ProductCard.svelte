<script lang="ts">
  import type { Product } from "../../lib/types/content";
  import { formatCents } from "../../stores/cart";

  // SSR-only presentational card (no `client:` at the call site in catalog.astro).
  let { product }: { product: Product } = $props();
</script>

<article class="card" data-category={product.category}>
  <div class="thumb">
    <img
      src={product.image}
      alt={`${product.name} — imagen del producto`}
      loading="lazy"
      data-fallback="/images/products/placeholder.svg"
    />
  </div>
  <span class="chip">{product.category}</span>

  {#if product.stock > 0 && product.stock <= 5}
    <span class="low-stock">Pocas unidades</span>
  {/if}

  <div class="body">
    <h3>{product.name}</h3>
    <p class="price">{formatCents(product.priceCents)}</p>

    {#if product.stock === 0}
      <span class="sold-out">Agotado</span>
    {:else}
      <button
        type="button"
        class="add"
        data-add-to-cart={product.id}
        aria-label={`Añadir ${product.name} al carrito`}
      >
        +
      </button>
    {/if}
  </div>
</article>

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .thumb {
    position: relative;
    background: var(--bg-surface-elevated);
    border-radius: var(--radius-image);
    aspect-ratio: 1 / 1;
    overflow: hidden;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .chip {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.78rem;
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-pill);
  }

  .low-stock {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: var(--accent-gold);
    color: var(--accent-on);
    font-weight: 700;
    font-size: 0.78rem;
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-pill);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .price {
    margin: 0;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .add {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-pill);
    background: var(--accent-primary);
    color: var(--accent-on);
    font-size: 1.3rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .add:hover,
  .add:focus-visible {
    transform: translateY(-2px);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .sold-out {
    align-self: flex-start;
    background: var(--bg-badge-pill);
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0.6rem 1rem;
    border-radius: var(--radius-pill);
  }
</style>