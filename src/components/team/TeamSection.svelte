<script lang="ts">
  import { onMount } from "svelte";
  import { dataStore, listFallbackTeamMembers } from "../../lib/data/store";
  import type { TeamMember } from "../../lib/types/domain";

  const PLACEHOLDER = "/images/placeholder.svg";

  let members = $state<TeamMember[]>([]);
  let loading = $state(true);
  let notice = $state("");

  function onAvatarError(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    if (img.getAttribute("src") === PLACEHOLDER) return;
    img.src = PLACEHOLDER;
  }

  onMount(() => {
    let active = true;
    (async () => {
      try {
        // Active members only (FR-003); the data layer hides inactive rows.
        members = await dataStore.listTeamMembers();
        notice = "";
      } catch {
        // Non-blocking fallback to the demo seed served by the data layer.
        try {
          members = await listFallbackTeamMembers();
        } catch {
          members = [];
        }
        notice = "No se pudo cargar el equipo en línea; mostrando el contenido local.";
      } finally {
        if (active) loading = false;
      }
    })();
    return () => {
      active = false;
    };
  });
</script>

{#if loading}
  <section class="team" aria-labelledby="team-title" aria-busy="true">
    <h2 id="team-title">Nuestro Equipo</h2>
    <p class="section-lead">Artistas y staff del estudio.</p>
    <ul class="grid" aria-hidden="true">
      {#each [0, 1, 2] as key (key)}
        <li class="card skeleton">
          <div class="sk-avatar"></div>
          <div class="sk-line sk-line-lg"></div>
          <div class="sk-line sk-line-sm"></div>
        </li>
      {/each}
    </ul>
  </section>
{:else if members.length > 0}
  <section class="team" aria-labelledby="team-title">
    <h2 id="team-title">Nuestro Equipo</h2>
    <p class="section-lead">Artistas y staff que cuidan cada detalle.</p>

    {#if notice}
      <p class="notice" role="status">{notice}</p>
    {/if}

    <ul class="grid">
      {#each members as member (member.id)}
        <li class="card">
          <div class="avatar">
            <img
              src={member.avatarUrl || PLACEHOLDER}
              alt={`Foto de ${member.name}`}
              loading="lazy"
              data-fallback={PLACEHOLDER}
              onerror={onAvatarError}
            />
          </div>
          <div class="body">
            <h3>{member.name}</h3>
            <p class="role">{member.role}</p>
            {#if member.bio}
              <p class="bio">{member.bio}</p>
            {/if}
            {#if member.instagramHandle}
              <a
                class="ig"
                href={`https://instagram.com/${encodeURIComponent(member.instagramHandle)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram de ${member.name}`}
              >
                Instagram · @{member.instagramHandle}
              </a>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .team {
    max-width: 1080px;
    margin: 0 auto;
    padding: clamp(2.5rem, 6vw, 4rem) clamp(1rem, 4vw, 1.5rem);
  }

  h2 {
    text-align: center;
    margin: 0 0 0.5rem;
    font-size: clamp(1.5rem, 4vw, 1.9rem);
    color: var(--text-primary);
  }

  .section-lead {
    text-align: center;
    margin: 0 0 1.75rem;
    color: var(--text-secondary);
  }

  .notice {
    margin: 0 auto 1.25rem;
    max-width: 560px;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(0.85rem, 3vw, 1.25rem);
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: clamp(1rem, 4vw, 1.35rem);
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    min-width: 0;
  }

  .avatar {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-image);
    overflow: hidden;
    background: var(--bg-surface-elevated);
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .role {
    margin: 0;
    color: var(--text-gold);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }

  .bio {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.92rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .ig {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    align-self: flex-start;
    min-height: 44px;
    margin-top: 0.15rem;
    padding: 0.4rem 0.85rem;
    border-radius: var(--radius-pill);
    border: var(--border-btn-secondary);
    background: var(--bg-btn-secondary);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.88rem;
    text-decoration: none;
    overflow-wrap: anywhere;
    transition: color 160ms ease, border-color 160ms ease;
  }

  .ig:hover,
  .ig:focus-visible {
    color: var(--accent-primary);
    border: var(--border-btn-secondary-hover);
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  /* Loading skeleton — mirrors the card shape in Dark Luxury tones. */
  .skeleton {
    animation: team-pulse 1.5s ease-in-out infinite;
  }

  .sk-avatar {
    width: 100%;
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
    width: 70%;
  }

  .sk-line-sm {
    width: 45%;
  }

  @keyframes team-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.55;
    }
  }

  @media (min-width: 600px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 900px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
    }
    .ig {
      transition: none;
    }
  }
</style>
