import type { APIRoute } from "astro";
import { CONTENT_UPDATED } from "../content/site";

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://ischca.dev").replace(/\/$/, "");
const PAGES = ["ja/", "en/", "ja/profile/", "en/profile/"];

// Each page lists its translation so search engines pair the two editions.
export const GET: APIRoute = () => {
  const urls = PAGES.map((page) => {
    const alternate = page.startsWith("ja/") ? page.replace(/^ja\//, "en/") : page.replace(/^en\//, "ja/");
    const [lang, altLang] = page.startsWith("ja/") ? ["ja", "en"] : ["en", "ja"];
    return [
      "  <url>",
      `    <loc>${SITE_URL}/${page}</loc>`,
      `    <lastmod>${CONTENT_UPDATED}</lastmod>`,
      `    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE_URL}/${page}"/>`,
      `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${SITE_URL}/${alternate}"/>`,
      "  </url>",
    ].join("\n");
  });
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
