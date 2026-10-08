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

  <div class="meta">
    <span class="chip">{product.category}</span>
    {#if product.stock > 0 && product.stock <= 5}
      <span class="low-stock">Pocas unidades</span>
    {/if}
  </div>

  <div class="body">
    <div class="info">
      <h3>{product.name}</h3>
      <p class="price">{formatCents(product.priceCents)}</p>
    </div>

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
    gap: 0.6rem;
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

  /* Category + stock alert sit BELOW the image, not floating over it. */
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .chip {
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.72rem;
    padding: 0.2rem 0.65rem;
    border-radius: var(--radius-pill);
  }

  .low-stock {
    background: var(--accent-gold);
    color: var(--accent-on);
    font-weight: 700;
    font-size: 0.72rem;
    padding: 0.2rem 0.65rem;
    border-radius: var(--radius-pill);
  }

  /* Name/price on the left, action button aligned to the right. */
  .body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
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
    flex: 0 0 auto;
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
    flex: 0 0 auto;
    background: var(--bg-badge-pill);
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.55rem 0.9rem;
    border-radius: var(--radius-pill);
  }

  @media (prefers-reduced-motion: reduce) {
    .add {
      transition: none;
    }
  }
</style>
