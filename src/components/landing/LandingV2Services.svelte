<script lang="ts">
  import { onMount } from "svelte";
  import { Clock } from "lucide-svelte";
  import { DataError, dataStore, listFallbackServices } from "../../lib/data/store";
  import { subscribeToDataChanges } from "../../lib/data/realtime";
  import {
    PIERCING_SERVICE_CATEGORIES,
    type PiercingService,
  } from "../../lib/data/services";
  import { formatCents } from "../../lib/utils/money";

  let services = $state<PiercingService[]>([]);
  let loading = $state(true);
  let loadError = $state("");
  let notice = $state("");

  const groups = $derived(
    PIERCING_SERVICE_CATEGORIES.map((category) => ({
      category,
      services: services.filter((service) => service.category === category.id),
    })).filter((group) => group.services.length > 0),
  );

  async function loadServices() {
    loading = true;
    loadError = "";
    notice = "";
    try {
      services = await dataStore.listServices();
    } catch {
      // Non-blocking fallback to the demo seed served by the data layer.
      try {
        services = await listFallbackServices();
        notice = "No se pudo cargar la lista en línea; mostrando el menú local.";
      } catch (err) {
        services = [];
        loadError =
          err instanceof DataError ? err.message : "No se pudieron cargar los servicios";
      }
    } finally {
      loading = false;
    }
  }

  // Live refresh: re-fetch in place without the loading skeleton (no teardown/scroll jump).
  async function refreshServices() {
    try {
      services = await dataStore.listServices();
      loadError = "";
    } catch {
      // Keep the last known content on a transient read failure.
    }
  }

  onMount(() => {
    void loadServices();

    let debounce: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToDataChanges(["services"], () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void refreshServices();
      }, 150);
    });

    return () => {
      if (debounce) clearTimeout(debounce);
      unsubscribe();
    };
  });
</script>

<div class="services" aria-busy={loading}>
  {#if loading}
    <ul class="skeleton-list" aria-hidden="true">
      {#each [0, 1, 2] as key (key)}
        <li class="skeleton-row">
          <div class="sk-line sk-line-lg"></div>
          <div class="sk-line sk-line-sm"></div>
        </li>
      {/each}
    </ul>
    <p class="hint" aria-live="polite">Cargando servicios…</p>
  {:else if loadError}
    <p class="error" role="alert">{loadError}</p>
  {:else}
    {#if notice}
      <p class="notice" role="status">{notice}</p>
    {/if}

    {#if groups.length === 0}
      <p class="empty" role="status">No hay servicios disponibles por el momento.</p>
    {:else}
      {#each groups as group (group.category.id)}
        <details class="group" open>
          <summary class="group-summary">
            <span class="group-title">{group.category.label}</span>
            <span class="group-desc">{group.category.description}</span>
            <span class="group-count" aria-hidden="true">{group.services.length}</span>
          </summary>

          <ul class="service-list">
            {#each group.services as service (service.id)}
              <li class="service-card">
                <div class="service-info">
                  <span class="service-name">{service.name}</span>
                  <span class="service-desc">{service.description}</span>
                  <span class="service-meta">
                    <Clock size={14} aria-hidden="true" />
                    {service.durationMinutes} min
                    {#if service.requiresDeposit}
                      <span class="deposit-badge">Requiere adelanto</span>
                    {/if}
                  </span>
                </div>
                <div class="service-action">
                  <span class="service-price">{formatCents(service.priceCents)}</span>
                  <a class="book-btn" href={`/booking?service=${service.id}`}>Reservar</a>
                </div>
              </li>
            {/each}
          </ul>
        </details>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .services {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .group {
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-translucent);
    overflow: hidden;
  }

  .group-summary {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    cursor: pointer;
    list-style: none;
  }

  .group-summary::-webkit-details-marker {
    display: none;
  }

  .group-summary:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: -2px;
  }

  .group-title {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-gold);
  }

  .group-desc {
    font-size: 0.72rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .group-count {
    margin-left: auto;
    min-width: 1.6rem;
    padding: 0.1rem 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
  }

  .service-list {
    list-style: none;
    margin: 0;
    padding: 0 0.75rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .service-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    min-width: 0;
  }

  .service-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .service-name {
    font-weight: 700;
    font-size: 1.02rem;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .service-desc {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .service-meta {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .deposit-badge {
    background: var(--bg-wood-pill);
    color: var(--accent-wood);
    border: 1px solid var(--accent-wood);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.55rem;
    border-radius: var(--radius-pill);
  }

  .service-action {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    flex: 0 0 auto;
  }

  .service-price {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .book-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 1.15rem;
    border-radius: var(--radius-btn);
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 600;
    text-decoration: none;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .book-btn:hover,
  .book-btn:focus-visible {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .hint,
  .notice,
  .empty {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .notice {
    text-align: center;
  }

  .empty {
    text-align: center;
    padding: 2.5rem 1rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-light);
  }

  .error {
    color: var(--accent-negative);
    text-align: center;
  }

  /* Loading skeleton — mirrors the card shape in Dark Luxury tones. */
  .skeleton-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .skeleton-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border: var(--border-card);
    border-radius: var(--radius-card);
    background: var(--bg-card-light);
    animation: services-pulse 1.5s ease-in-out infinite;
  }

  .sk-line {
    height: 0.9rem;
    border-radius: var(--radius-pill);
    background: var(--bg-badge-pill);
  }

  .sk-line-lg {
    width: 70%;
  }

  .sk-line-sm {
    width: 45%;
  }

  @keyframes services-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.55;
    }
  }

  @media (min-width: 768px) {
    .service-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-row {
      animation: none;
    }
    .book-btn {
      transition: none;
    }
    .book-btn:hover,
    .book-btn:focus-visible {
      transform: none;
    }
  }
</style>
