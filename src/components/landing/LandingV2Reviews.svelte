<script lang="ts">
  import { STUDIO_RATING, STUDIO_RATING_DISTRIBUTION, STUDIO_REVIEWS } from "../../lib/types/content";

  // Bars run from best (5★) to worst (1★), Setmore-style.
  const DISTRIBUTION = [...STUDIO_RATING_DISTRIBUTION].sort((a, b) => b.stars - a.stars);
  const total = STUDIO_RATING.count;

  const filledStars = Math.round(STUDIO_RATING.value);
</script>

<section class="reviews" id="resenas" aria-labelledby="reviews-title">
  <h2 id="reviews-title">Reseñas</h2>

  <div class="summary">
    <span class="score" aria-label={`Calificación ${STUDIO_RATING.value.toFixed(1)} de 5`}>
      {STUDIO_RATING.value.toFixed(1)}
    </span>
    <div class="score-side">
      <span class="stars" aria-hidden="true">
        {#each [1, 2, 3, 4, 5] as star (star)}
          <span class:filled={star <= filledStars}>★</span>
        {/each}
      </span>
      <span class="meta">{STUDIO_RATING.count} reseñas</span>
    </div>
  </div>

  <ul class="distribution">
    {#each DISTRIBUTION as entry (entry.stars)}
      <li class="bar-row">
        <span class="bar-stars" aria-hidden="true">{entry.stars}★</span>
        <span class="bar-track" aria-hidden="true">
          <span class="bar-fill" style={`width: ${total > 0 ? (entry.count / total) * 100 : 0}%`}></span>
        </span>
        <span class="bar-count">{entry.count}</span>
      </li>
    {/each}
  </ul>

  <ul class="list">
    {#each STUDIO_REVIEWS as review (review.id)}
      <li class="review">
        <p class="review-head">
          <span class="review-author">{review.author}</span>
          <time class="review-date" datetime={review.date}>{review.date}</time>
        </p>
        {#if review.rating}
          <p class="review-stars" aria-label={`${review.rating} de 5 estrellas`}>
            {#each [1, 2, 3, 4, 5] as star (star)}
              <span class:on={star <= review.rating}>★</span>
            {/each}
          </p>
        {/if}
        <p class="review-text">“{review.text}”</p>
      </li>
    {/each}
  </ul>
</section>

<style>
  .reviews {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: clamp(1.25rem, 4vw, 1.75rem);
    background: var(--bg-card-light);
    border: var(--border-card);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    scroll-margin-top: 5.5rem;
  }

  h2 {
    margin: 0 0 0.25rem;
    font-size: clamp(1.35rem, 4vw, 1.7rem);
    color: var(--text-primary);
  }

  .summary {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .score {
    font-size: 3rem;
    line-height: 1;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--text-gold);
  }

  .score-side {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stars {
    color: var(--text-muted);
    font-size: 1.15rem;
    letter-spacing: 0.1em;
  }

  .stars .filled {
    color: var(--text-gold);
  }

  .meta {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .distribution {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 2.2rem minmax(0, 1fr) 2.2rem;
    align-items: center;
    gap: 0.6rem;
  }

  .bar-stars {
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 700;
    text-align: right;
  }

  .bar-track {
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--bg-badge-pill);
    overflow: hidden;
  }

  .bar-fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--text-gold);
  }

  .bar-count {
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--divider-subtle);
    display: flex;
    flex-direction: column;
  }

  .review {
    padding: 1rem 0;
    border-bottom: 1px solid var(--divider-subtle);
    min-width: 0;
  }

  .review:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .review-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0 0 0.3rem;
  }

  .review-author {
    font-weight: 700;
    color: var(--text-primary);
  }

  .review-date {
    color: var(--text-muted);
    font-size: 0.78rem;
  }

  .review-stars {
    margin: 0 0 0.35rem;
    color: var(--text-muted);
    letter-spacing: 0.12em;
    font-size: 0.85rem;
  }

  .review-stars .on {
    color: var(--text-gold);
  }

  .review-text {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.95rem;
    overflow-wrap: anywhere;
  }
</style>