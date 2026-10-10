<script lang="ts">
  import { onMount } from "svelte";
  import { X } from "lucide-svelte";
  import { DataError, dataStore, listFallbackGalleryItems } from "../../lib/data/store";
  import { subscribeToDataChanges } from "../../lib/data/realtime";
  import type { GalleryItemRecord } from "../../lib/types/domain";

  let items = $state<GalleryItemRecord[]>([]);
  let loading = $state(true);
  let error = $state("");
  let notice = $state("");

  // Lightbox state (client-only).
  let lightboxOpen = $state(false);
  let lightboxIndex = $state(0);
  let dialogEl = $state<HTMLElement | null>(null);
  let lastFocused: HTMLElement | null = null;

  async function loadGallery() {
    loading = true;
    error = "";
    notice = "";
    try {
      items = await dataStore.listGalleryItems();
    } catch {
      // Non-blocking fallback to the demo seed served by the data layer.
      try {
        items = await listFallbackGalleryItems();
        notice = "No se pudo cargar la galería en línea; mostrando el contenido local.";
      } catch (err) {
        items = [];
        error = err instanceof DataError ? err.message : "No se pudo cargar la galería";
      }
    } finally {
      loading = false;
    }
  }

  // Live refresh: re-fetch in place, keeping the current layout and scroll position.
  async function refreshGallery() {
    try {
      items = await dataStore.listGalleryItems();
      error = "";
    } catch {
      // Keep the last known content on a transient read failure.
    }
  }

  function openLightbox(index: number) {
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lightboxIndex = index;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightboxOpen = false;
    lastFocused?.focus();
    lastFocused = null;
  }

  function stepLightbox(delta: number) {
    if (items.length === 0) return;
    lightboxIndex = (lightboxIndex + delta + items.length) % items.length;
  }

  function onKeydown(event: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (event.key === "Escape") closeLightbox();
    else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepLightbox(-1);
    }
  }

  // Move focus into the dialog when it opens.
  $effect(() => {
    if (lightboxOpen && dialogEl) dialogEl.focus();
  });

  onMount(() => {
    void loadGallery();

    // Live sync (feature 016, FR-014): debounce, coalesce and patch in place.
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToDataChanges(["gallery"], () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void refreshGallery();
      }, 150);
    });

    return () => {
      if (debounce) clearTimeout(debounce);
      unsubscribe();
    };
  });
</script>

<svelte:window onkeydown={onKeydown} />

{#if loading}
  <ul class="mosaic" aria-busy="true">
    {#each [0, 1, 2, 3] as key (key)}
      <li class="skeleton"></li>
    {/each}
  </ul>
  <p class="hint" aria-live="polite">Cargando galería…</p>
{:else if error}
  <p class="error" role="alert">{error}</p>
{:else}
  {#if notice}
    <p class="notice" role="status">{notice}</p>
  {/if}

  {#if items.length === 0}
    <p class="empty" role="status">No hay fotos por el momento.</p>
  {:else}
    <ul class="mosaic">
      {#each items as item, i (item.id)}
        <li>
          <button
            type="button"
            class="tile"
            aria-label={`Ampliar foto ${i + 1} de ${items.length}${item.title ? `: ${item.title}` : ""}`}
            onclick={() => openLightbox(i)}
          >
            <img
              src={item.imageUrl}
              alt={item.title || "Foto de la galería"}
              loading="lazy"
              data-fallback="/images/placeholder.svg"
            />
            {#if item.title || item.category}
              <span class="chip">{item.category || item.title}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

{#if lightboxOpen && items.length > 0}
  <div class="lb-backdrop" onclick={closeLightbox} role="presentation"></div>
  <section
    class="lightbox"
    role="dialog"
    aria-modal="true"
    aria-label={`Foto ${lightboxIndex + 1} de ${items.length}`}
    tabindex="-1"
    bind:this={dialogEl}
  >
    <button type="button" class="lb-close" aria-label="Cerrar" onclick={closeLightbox}>
      <X size={24} aria-hidden="true" />
    </button>
    <button type="button" class="lb-nav lb-prev" aria-label="Foto anterior" onclick={() => stepLightbox(-1)}>
      ‹
    </button>
    <figure class="lb-figure">
      <img src={items[lightboxIndex].imageUrl} alt={items[lightboxIndex].title || `Foto ${lightboxIndex + 1}`} />
      <figcaption>
        {items[lightboxIndex].title || "ALPIERCING"}
        {#if items[lightboxIndex].category}
          <span class="lb-category"> · {items[lightboxIndex].category}</span>
        {/if}
      </figcaption>
    </figure>
    <button type="button" class="lb-nav lb-next" aria-label="Foto siguiente" onclick={() => stepLightbox(1)}>
      ›
    </button>
  </section>
{/if}

<style>
  .mosaic {
    list-style: none;
    margin: 0;
    padding: 0;
    column-count: 2;
    column-gap: 1rem;
  }

  .mosaic li {
    break-inside: avoid;
    margin-bottom: 1rem;
  }

  .tile {
    position: relative;
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: var(--bg-card-light);
    border-radius: var(--radius-card);
    overflow: hidden;
    cursor: zoom-in;
  }

  .tile img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }

  .tile:hover img,
  .tile:focus-visible img {
    transform: scale(1.02);
  }

  .tile:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .tile img {
    transition: transform 160ms ease;
  }

  .chip {
    position: absolute;
    left: 0.75rem;
    bottom: 0.75rem;
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius-pill);
    overflow-wrap: anywhere;
  }

  .skeleton {
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-card);
    background: var(--bg-card-translucent);
    animation: gallery-pulse 1.5s ease-in-out infinite;
  }

  .hint,
  .notice,
  .empty {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .notice,
  .empty {
    text-align: center;
  }

  .empty {
    padding: 2.5rem 1rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-light);
  }

  .error {
    color: var(--accent-negative);
    text-align: center;
  }

  /* --- Lightbox --- */
  .lb-backdrop {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-modal) - 1);
    background: var(--overlay-backdrop);
  }

  .lightbox {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    outline: none;
  }

  .lb-figure {
    margin: 0;
    max-width: min(92vw, 1100px);
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    align-items: center;
  }

  .lb-figure img {
    max-width: 92vw;
    max-height: 74vh;
    width: auto;
    height: auto;
    display: block;
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    background: var(--bg-surface-elevated);
  }

  .lb-figure figcaption {
    color: var(--text-primary);
    font-weight: 600;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .lb-category {
    color: var(--text-muted);
  }

  .lb-close,
  .lb-nav {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 1.4rem;
    cursor: pointer;
  }

  .lb-close:hover,
  .lb-close:focus-visible,
  .lb-nav:hover,
  .lb-nav:focus-visible {
    border-color: var(--accent-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .lb-close {
    top: 1rem;
    right: 1rem;
  }

  .lb-prev {
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .lb-next {
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }

  @media (max-width: 600px) {
    .lb-nav {
      top: auto;
      bottom: 1rem;
      transform: none;
    }

    .lb-prev {
      left: 1rem;
    }

    .lb-next {
      right: 1rem;
    }
  }

  @media (min-width: 900px) {
    .mosaic {
      column-count: 3;
    }
  }

  @media (min-width: 1200px) {
    .mosaic {
      column-count: 4;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
    }
    .tile img {
      transition: none;
    }
    .tile:hover img,
    .tile:focus-visible img {
      transform: none;
    }
  }
</style>