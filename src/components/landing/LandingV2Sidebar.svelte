<script lang="ts">
  import { onMount } from "svelte";
  import { BRAND_LOGO } from "../../lib/config";
  import { STUDIO_PROFILE } from "../../lib/types/content";
  import { DEFAULT_BUSINESS_HOURS, getOpenStatus, type OpenStatus } from "../../lib/utils/hours";

  let status = $state<OpenStatus>(getOpenStatus(DEFAULT_BUSINESS_HOURS, new Date()));

  onMount(() => {
    const tick = () => {
      status = getOpenStatus(DEFAULT_BUSINESS_HOURS, new Date());
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  });
</script>

<section class="card" aria-label="Resumen del estudio">
  <div class="identity">
    <img
      class="avatar"
      src={BRAND_LOGO}
      alt={`${STUDIO_PROFILE.brand} logo`}
      width="64"
      height="64"
    />
    <div class="identity-text">
      <p class="brand">{STUDIO_PROFILE.brand}</p>
    </div>
  </div>

  <p class="status" class:open={status.open}>
    <span class="status-dot" aria-hidden="true"></span>
    {status.label}
  </p>

  <p class="address">📍 {STUDIO_PROFILE.location}</p>

  <a class="cta" href="/booking">Reservar mi cita</a>
</section>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: clamp(1.25rem, 4vw, 1.6rem);
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }

  .identity {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .avatar {
    width: 64px;
    height: 64px;
    flex: 0 0 auto;
    object-fit: contain;
    border-radius: var(--radius-image);
    background: var(--bg-surface-elevated);
    border: var(--border-card);
    padding: 0.35rem;
    mix-blend-mode: screen;
  }

  .identity-text {
    min-width: 0;
  }

  .brand {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--text-gold);
    overflow-wrap: anywhere;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .status.open {
    color: var(--accent-primary);
  }

  .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: currentColor;
    flex: 0 0 auto;
  }

  .address {
    margin: 0;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.92rem;
    overflow-wrap: anywhere;
  }

  .cta {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 50px;
    margin-top: 0.25rem;
    border-radius: var(--radius-btn);
    background: var(--accent-primary);
    color: var(--accent-on);
    font-weight: 700;
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

  @media (prefers-reduced-motion: reduce) {
    .cta {
      transition: none;
    }
    .cta:hover,
    .cta:focus-visible {
      transform: none;
    }
  }
</style>