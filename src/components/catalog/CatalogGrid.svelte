<script lang="ts">
  import { onMount } from "svelte";
  import ProductCard from "./ProductCard.svelte";
  import { PRODUCTS } from "../../lib/types/content";
  import { DataError, dataStore } from "../../lib/data/store";
  import { isSupabaseConfigured } from "../../lib/data/supabase-client";
  import { subscribeToProductChanges } from "../../lib/services/catalog";
  import type { ProductRecord } from "../../lib/types/domain";

  // Production (Supabase configured) starts empty and shows a skeleton until the
  // real rows arrive (no mock flicker). Demo/LocalStorage keeps the static seed
  // as its instant content because the local adapter is seeded with it too.
  const isProduction = isSupabaseConfigured();
  const fallback: ProductRecord[] = PRODUCTS.map((product) => ({ ...product, published: true }));

  const skeletons = [0, 1, 2, 3, 4, 5];

  let products = $state<ProductRecord[]>(isProduction ? [] : fallback);
  let loading = $state(isProduction);
  let loadError = $state("");

  async function refresh() {
    try {
      products = await dataStore.listProducts({ includeUnpublished: false });
      loadError = "";
    } catch (err) {
      // In demo keep the static seed visible; in production surface the error.
      loadError = err instanceof DataError ? err.message : "No se pudo cargar el catálogo";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void refresh();
    // Auto-refresh when products change (admin hides/stocks) — see catalog service.
    return subscribeToProductChanges(() => void refresh());
  });
</script>

{#if loading}
  <div class="grid" aria-hidden="true" aria-busy="true">
    {#each skeletons as key (key)}
      <div class="skeleton">
        <div class="sk-thumb"></div>
        <div class="sk-line sk-line-lg"></div>
        <div class="sk-line sk-line-sm"></div>
      </div>
    {/each}
  </div>
{:else}
  {#if loadError}
    <p class="error" role="alert">{loadError}</p>
  {/if}

  {#if products.length === 0 && !loadError}
    <p class="empty-state" role="status">
      No hay productos disponibles en el catálogo por el momento.
    </p>
  {:else if products.length > 0}
    <div class="grid">
      {#each products as product (product.id)}
        <ProductCard product={product} />
      {/each}
    </div>
  {/if}
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .error {
    color: var(--accent-negative);
    text-align: center;
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    font-size: 1.05rem;
    padding: 3rem 1rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-light);
  }

  /* Skeleton loader — mirrors the ProductCard shape in Dark Luxury tones. */
  .skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .sk-thumb {
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-image);
    background: var(--bg-surface-elevated);
  }

  .sk-line {
    height: 0.9rem;
    border-radius: var(--radius-pill);
    background: var(--bg-badge-pill);
  }

  .sk-line-lg {
    width: 85%;
  }

  .sk-line-sm {
    width: 50%;
  }

  @keyframes skeleton-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.55;
    }
  }

  @media (min-width: 768px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 360px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
    }
  }
</style>
