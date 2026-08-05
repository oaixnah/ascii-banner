import type { SiteLocale } from "../i18n/ui";
import type { GalleryFontEntry } from "./types";

export const fontDetailPath = (font: Pick<GalleryFontEntry, "slug" | "indexed">, locale: SiteLocale) => (
  locale === "zh" && font.indexed
    ? `/zh/fonts/${font.slug}/`
    : `/fonts/${font.slug}/`
);
