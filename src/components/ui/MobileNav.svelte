<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Menu, X } from "lucide-svelte";
  import { NAV_ITEMS } from "../../lib/types/content";

  let open = $state(false);
  let pathname = $state("/");
  let toggleEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLElement | null>(null);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function openNav() {
    open = true;
  }

  function closeNav(restoreFocus = true) {
    open = false;
    if (restoreFocus) toggleEl?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === "Escape") closeNav();
  }

  // Lock body scroll while open and move focus into the panel.
  $effect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.style.overflow = "hidden";
      panelEl?.focus();
    } else {
      document.body.style.overflow = "";
    }
  });

  onMount(() => {
    pathname = window.location.pathname;
  });

  onDestroy(() => {
    if (typeof document !== "undefined") document.body.style.overflow = "";
  });
</script>

<svelte:window onkeydown={onKeydown} />

<button
  type="button"
  class="nav-toggle"
  bind:this={toggleEl}
  aria-label={open ? "Cerrar menú" : "Abrir menú"}
  aria-expanded={open}
  aria-controls="mobile-nav-panel"
  onclick={() => (open ? closeNav() : openNav())}
>
  {#if open}
    <X size={22} aria-hidden="true" />
  {:else}
    <Menu size={22} aria-hidden="true" />
  {/if}
</button>

{#if open}
  <div class="nav-backdrop" onclick={() => closeNav()} role="presentation"></div>
  <nav
    id="mobile-nav-panel"
    class="nav-panel"
    aria-label="Navegación principal"
    tabindex="-1"
    bind:this={panelEl}
  >
    <ul class="nav-list">
      {#each NAV_ITEMS as item (item.href)}
        <li>
          <a
            class="nav-link"
            class:active={isActive(item.href)}
            aria-current={isActive(item.href) ? "page" : undefined}
            href={item.href}
            onclick={() => closeNav(false)}
          >
            {item.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}

<style>
  .nav-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 160ms ease, border-color 160ms ease;
  }

  .nav-toggle:hover,
  .nav-toggle:focus-visible {
    color: var(--accent-primary);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .nav-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: var(--overlay-backdrop);
  }

  .nav-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-modal);
    width: min(300px, 85vw);
    padding: 5rem 1.25rem 1.5rem;
    background: var(--bg-navbar-glass);
    backdrop-filter: blur(var(--blur-navbar));
    -webkit-backdrop-filter: blur(var(--blur-navbar));
    border-left: var(--border-card);
    box-shadow: var(--shadow-glow);
    animation: nav-slide 200ms ease;
    outline: none;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-pill);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    transition: color 160ms ease, background-color 160ms ease;
  }

  .nav-link:hover {
    color: var(--text-gold);
    background: var(--bg-card-translucent);
  }

  .nav-link:focus-visible {
    color: var(--text-gold);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .nav-link.active {
    color: var(--accent-on);
    background: var(--accent-primary);
    box-shadow: var(--shadow-glow);
  }

  @keyframes nav-slide {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  /* The hamburger only exists below the 768px breakpoint. */
  @media (min-width: 768px) {
    .nav-toggle {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-toggle,
    .nav-link {
      transition: none;
    }
    .nav-panel {
      animation: none;
    }
  }
</style>
