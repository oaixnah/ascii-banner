import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import { loadEnv } from "vite";

const fileEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const rawSiteUrl = process.env.SITE_URL ?? fileEnv.SITE_URL;
if (!rawSiteUrl) {
  throw new Error("SITE_URL is required. Set it to the public HTTPS origin, for example https://asciibanner.dev.");
}

let siteUrl;
try {
  const parsed = new URL(rawSiteUrl);
  const isOriginOnly = parsed.pathname === "/" && !parsed.search && !parsed.hash;
  const hasCredentials = Boolean(parsed.username || parsed.password);
  if (parsed.protocol !== "https:" || !isOriginOnly || hasCredentials) throw new Error();
  siteUrl = parsed.origin;
} catch {
  throw new Error("SITE_URL must be an HTTPS origin without a path, query, hash, or credentials.");
}

export default defineConfig({
  site: siteUrl,
  output: "static",
  env: {
    schema: {
      SITE_URL: envField.string({
        context: "server",
        access: "secret",
        url: true,
      }),
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
  integrations: [react()],
  vite: {
    worker: {
      format: "es",
    },
  },
});
