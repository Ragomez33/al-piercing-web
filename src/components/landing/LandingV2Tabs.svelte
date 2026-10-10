<script lang="ts">
  import { onMount } from "svelte";
  import { Clock } from "lucide-svelte";
  import { DataError, dataStore, listFallbackServices } from "../../lib/data/store";
  import {
    PIERCING_SERVICE_CATEGORIES,
    type PiercingService,
  } from "../../lib/data/services";
  import { formatCents } from "../../lib/utils/money";
  import { GALLERY_ITEMS, PROCESS_STEPS } from "../../lib/types/content";
  import TeamSection from "../team/TeamSection.svelte";

  type TabId = "services" | "team" | "process";

  const TABS: { id: TabId; label: string }[] = [
    { id: "services", label: "Servicios" },
    { id: "team", label: "Equipo" },
    { id: "process", label: "Proceso & Galería" },
  ];

  let activeTab = $state<TabId>("services");
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

  function isTabId(value: string | null): value is TabId {
    return value === "services" || value === "team" || value === "process";
  }

  function selectTab(id: TabId) {
    activeTab = id;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url);
  }

  function onTablistKeydown(event: KeyboardEvent) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const list = event.currentTarget as HTMLElement;
    const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let next = current < 0 ? 0 : current;
    if (event.key === "ArrowRight") next = (next + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (next - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    tabs[next]?.focus();
    const target = TABS[next];
    if (target) selectTab(target.id);
  }

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

  onMount(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (isTabId(param)) activeTab = param;
    void loadServices();
  });
</script>

<section class="landing-tabs" aria-label="Contenido del estudio">
  <div class="tablist" role="tablist" aria-label="Secciones del estudio" onkeydown={onTablistKeydown}>
    {#each TABS as tab (tab.id)}
      <button
        type="button"
        role="tab"
        id={`tab-${tab.id}`}
        aria-selected={activeTab === tab.id}
        aria-controls={`panel-${tab.id}`}
        tabindex={activeTab === tab.id ? 0 : -1}
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => selectTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Servicios -->
  <div
    id="panel-services"
    role="tabpanel"
    aria-labelledby="tab-services"
    tabindex="0"
    hidden={activeTab !== "services"}
    class="panel"
  >
    {#if loading}
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
          <div class="group">
            <h3 class="group-title">
              {group.category.label}
              <span class="group-desc">{group.category.description}</span>
            </h3>

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
                        <span class="deposit-badge">Requiere seña</span>
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
          </div>
        {/each}
      {/if}
    {/if}
  </div>

  <!-- Equipo -->
  <div
    id="panel-team"
    role="tabpanel"
    aria-labelledby="tab-team"
    tabindex="0"
    hidden={activeTab !== "team"}
    class="panel"
  >
    <TeamSection />
  </div>

  <!-- Proceso & Galería -->
  <div
    id="panel-process"
    role="tabpanel"
    aria-labelledby="tab-process"
    tabindex="0"
    hidden={activeTab !== "process"}
    class="panel"
  >
    <ol class="steps">
      {#each PROCESS_STEPS as step (step.order)}
        <li class="step">
          <span class="step-num" aria-hidden="true">{step.order}</span>
          <div class="step-body">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>
      {/each}
    </ol>

    <a class="cta" href="/booking">Reservar mi turno</a>

    <div class="gallery">
      {#each GALLERY_ITEMS as item (item.image)}
        <figure class="tile">
          <img src={item.image} alt={item.alt} loading="lazy" data-fallback="/images/placeholder.svg" />
          {#if item.label}
            <figcaption>{item.label}</figcaption>
          {/if}
        </figure>
      {/each}
    </div>
  </div>
</section>

<style>
  .landing-tabs {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .tablist {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tab {
    min-height: 44px;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
  }

  .tab:hover {
    color: var(--text-gold);
  }

  .tab:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .tab.active {
    background: var(--accent-primary);
    color: var(--accent-on);
    box-shadow: var(--shadow-glow);
  }

  .panel {
    outline: none;
  }

  .panel:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 4px;
    border-radius: var(--radius-card);
  }

  /* --- Servicios --- */
  .group {
    margin-bottom: 1.5rem;
  }

  .group-title {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0 0 0.6rem;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-gold);
  }

  .group-desc {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    text-transform: none;
    color: var(--text-muted);
    font-weight: 600;
  }

  .service-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
  }

  .service-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.15rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
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

  /* --- Proceso & Galería --- */
  .steps {
    list-style: none;
    margin: 0 0 1.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .step {
    display: flex;
    gap: 0.9rem;
    padding: 1rem 1.15rem;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }

  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 700;
    box-shadow: var(--shadow-glow);
  }

  .step-body {
    min-width: 0;
  }

  .step-body h3 {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .step-body p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .cta {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 52px;
    margin-bottom: 1.5rem;
    border-radius: var(--radius-btn);
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    box-shadow: var(--shadow-glow);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .cta:hover,
  .cta:focus-visible {
    transform: translateY(-1px);
    box-shadow: var(--glow-btn-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .tile {
    position: relative;
    margin: 0;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }

  .tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .tile figcaption {
    position: absolute;
    left: 0.75rem;
    bottom: 0.75rem;
    background: var(--bg-badge-pill);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.78rem;
    padding: 0.25rem 0.7rem;
    border-radius: var(--radius-pill);
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

  @media (min-width: 768px) {
    .service-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .gallery {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tab,
    .book-btn,
    .cta {
      transition: none;
    }
    .book-btn:hover,
    .book-btn:focus-visible,
    .cta:hover,
    .cta:focus-visible {
      transform: none;
    }
  }
</style>
