import react from "@astrojs/react";
import { defineConfig } from "astro/config";

const publicSiteUrl = process.env.PUBLIC_SITE_URL;
const publicBasePath = process.env.PUBLIC_BASE_PATH;

export default defineConfig({
  output: "static",
  ...(publicSiteUrl ? { site: publicSiteUrl } : {}),
  ...(publicBasePath ? { base: publicBasePath } : {}),
  integrations: [react()],
  i18n: {
    defaultLocale: "ja",
    locales: ["ja", "en"],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    build: {
      target: "es2022",
    },
  },
});
