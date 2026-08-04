import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("./src/data/font-manifest.generated.json", import.meta.url), "utf8"),
);
const nonIndexedFontPaths = new Set(
  manifest.filter((font) => !font.indexed).map((font) => `/fonts/${font.slug}/`),
);

export default defineConfig({
  site: "https://asciibanner.dev",
  output: "static",
  env: {
    schema: {
      CONTACT_EMAIL: envField.string({
        context: "server",
        access: "secret",
        min: 3,
        max: 254,
        includes: "@",
      }),
      GA_MEASUREMENT_ID: envField.string({
        context: "server",
        access: "secret",
        min: 6,
        max: 32,
        startsWith: "G-",
      }),
      CLARITY_PROJECT_ID: envField.string({
        context: "server",
        access: "secret",
        min: 5,
        max: 64,
      }),
    },
    validateSecrets: true,
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !nonIndexedFontPaths.has(new URL(page).pathname),
    }),
  ],
  vite: {
    worker: {
      format: "es",
    },
  },
});
