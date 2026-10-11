<script lang="ts">
  import { onMount } from "svelte";
  import { subscribeToDataChanges } from "../../lib/data/realtime";
  import { getStudioOpenStatus } from "../../lib/services/availability";
  import type { OpenStatus } from "../../lib/utils/hours";

  // Live open/closed badge (feature 018). Reactive: re-checks every minute and
  // immediately when the admin changes the schedule or blocks (realtime) or when
  // the tab regains focus (the realtime transport dispatches focus events).
  let status = $state<OpenStatus | null>(null);

  async function refresh() {
    try {
      status = await getStudioOpenStatus();
    } catch {
      // Keep the last known status on transient failures.
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    void refresh();
    timer = setInterval(() => void refresh(), 60_000);
    unsubscribe = subscribeToDataChanges(["blocks", "schedule"], () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void refresh(), 200);
    });
    return () => {
      if (timer) clearInterval(timer);
      if (debounce) clearTimeout(debounce);
      unsubscribe?.();
    };
  });
</script>

{#if status}
  <p class="studio-status" class:open={status.open} role="status">
    <span class="dot" aria-hidden="true"></span>
    {status.label}
  </p>
{:else}
  <p class="studio-status pending" role="status">
    <span class="dot" aria-hidden="true"></span>
    Consultando horario…
  </p>
{/if}

<style>
  .studio-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.45rem 0.9rem;
    border-radius: var(--radius-pill);
    border: var(--border-card);
    background: var(--bg-badge-pill);
    color: var(--text-muted);
    font-weight: 700;
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }

  .studio-status.open {
    color: var(--accent-primary);
    border-color: var(--accent-primary);
  }

  .studio-status.pending {
    color: var(--text-muted);
  }

  .dot {
    flex: 0 0 auto;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: currentColor;
  }
</style>