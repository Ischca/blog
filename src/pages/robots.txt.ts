import type { APIRoute } from "astro";

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://ischca.dev").replace(/\/$/, "");

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
