<script lang="ts">
  import { onMount } from "svelte";
  import ProductCard from "./ProductCard.svelte";
  import { PRODUCTS } from "../../lib/types/content";
  import { DataError, dataStore } from "../../lib/data/store";
  import type { ProductRecord } from "../../lib/types/domain";

  // SSR fallback: the static catalog (works without JS and on first paint).
  const fallback: ProductRecord[] = PRODUCTS.map((product) => ({ ...product, published: true }));

  let products = $state<ProductRecord[]>(fallback);
  let loadError = $state("");

  onMount(async () => {
    try {
      products = await dataStore.listProducts({ includeUnpublished: false });
    } catch (err) {
      // Keep the static fallback visible instead of a blank grid.
      loadError = err instanceof DataError ? err.message : "No se pudo cargar el catálogo";
    }
  });
</script>

{#if loadError}
  <p class="error" role="alert">{loadError}</p>
{/if}

<div class="grid">
  {#each products as product (product.id)}
    <ProductCard product={product} />
  {/each}
</div>

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
</style>