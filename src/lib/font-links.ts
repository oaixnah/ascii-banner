import type { SiteLocale } from "../i18n/ui";
import type { FontManifestEntry } from "./types";

export const fontDetailPath = (font: FontManifestEntry, locale: SiteLocale) => (
  locale === "zh" && font.indexed
    ? `/zh/fonts/${font.slug}/`
    : `/fonts/${font.slug}/`
);
