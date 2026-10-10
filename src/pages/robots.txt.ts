/**
 * Generated robots.txt (feature 014).
 *
 * Emitted as a static endpoint (prerendered to `/robots.txt`) so the `Sitemap:` directive is an
 * absolute URL built from the configured site (`import.meta.env.SITE`) instead of a hardcoded domain.
 */
import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/seo";

export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "",
    `Sitemap: ${absoluteUrl("/sitemap-index.xml")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
