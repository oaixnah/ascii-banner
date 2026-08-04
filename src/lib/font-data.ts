import manifest from "../data/font-manifest.generated.json";
import type { FontManifestEntry } from "./types";

export const fonts = manifest as FontManifestEntry[];
export const indexedFonts = fonts.filter((font) => font.indexed);
export const fontBySlug = new Map(fonts.map((font) => [font.slug, font]));
