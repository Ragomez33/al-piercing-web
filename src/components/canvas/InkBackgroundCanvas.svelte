<script lang="ts">
  import { onMount } from "svelte";

  let canvas!: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Clamp device pixel ratio for 60fps on mid/low-range devices (research.md §2).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Colors come from tokens.css only — never hardcode brand values in components.
    const rootStyle = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string): string =>
      rootStyle.getPropertyValue(name).trim() || fallback;
    const blobCore = token("--ink-blob-core", "rgba(229, 169, 60, 0.10)");
    const blobAccent = token("--ink-blob-accent", "rgba(184, 122, 75, 0.12)");
    const blobTransparent = token("--ink-blob-transparent", "rgba(229, 169, 60, 0)");

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;

    // Pre-rendered soft ink blob sprite (one radial-glow texture reused each frame).
    const sprite = document.createElement("canvas");
    const spriteSize = 160;
    sprite.width = spriteSize;
    sprite.height = spriteSize;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(
        spriteSize / 2, spriteSize / 2, 0,
        spriteSize / 2, spriteSize / 2, spriteSize / 2,
      );
      g.addColorStop(0, blobCore);
      g.addColorStop(0.5, blobAccent);
      g.addColorStop(1, blobTransparent);
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, spriteSize, spriteSize);
    }

    type Blob = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      phase: number;
      speed: number;
    };

    function createBlobs(): Blob[] {
      return Array.from({ length: 14 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 90 + Math.random() * 160,
        vx: (Math.random() - 0.5) * 0.00012,
        vy: (Math.random() - 0.5) * 0.0001,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5,
      }));
    }

    const blobs = createBlobs();

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFrame(t: number) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      const now = t / 1000;
      for (const b of blobs) {
        b.x += b.vx * (1 + Math.sin(now / 3 + b.phase) * 0.6);
        b.y += b.vy * (1 + Math.cos(now / 4 + b.phase) * 0.6);
        if (b.x < -0.2) b.x = 1.2;
        else if (b.x > 1.2) b.x = -0.2;
        if (b.y < -0.2) b.y = 1.2;
        else if (b.y > 1.2) b.y = -0.2;
        const pulse = 1 + Math.sin(now * b.speed + b.phase) * 0.12;
        const size = b.r * pulse;
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sprite, b.x * width - size / 2, b.y * height - size / 2, size, size);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    function loop(t: number) {
      drawFrame(t);
      raf = requestAnimationFrame(loop);
    }

    function onVisibility() {
      // Battery-friendly: pause the rAF loop while the tab is hidden.
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else if (!running && !reduceMotion) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    }

    // Reduced motion: render a single static frame and never animate.
    if (reduceMotion) {
      resize();
      drawFrame(performance.now());
      running = false;
      return;
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    running = true;
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });
</script>

<canvas
  bind:this={canvas}
  class="ink-canvas"
  role="presentation"
  aria-hidden="true"
></canvas>

<style>
  .ink-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: block;
  }
</style>