import { FONT_CATEGORIES, type FontCategory, type GalleryFontEntry } from "./types";

const FIELD_SEPARATOR = "\t";
const RECORD_SEPARATOR = "\n";

const assertSafeField = (value: string) => {
  if (value.includes(FIELD_SEPARATOR) || value.includes(RECORD_SEPARATOR)) {
    throw new Error("Gallery font fields must not contain tabs or newlines.");
  }
  return value;
};

export const packGalleryFonts = (fonts: GalleryFontEntry[]) => fonts.map((font) => [
  assertSafeField(font.name),
  assertSafeField(font.slug),
  FONT_CATEGORIES.indexOf(font.category),
  font.height,
  font.popularRank ?? "",
  font.indexed ? 1 : 0,
].join(FIELD_SEPARATOR)).join(RECORD_SEPARATOR);

export const unpackGalleryFonts = (catalog: string): GalleryFontEntry[] => {
  if (!catalog) return [];

  return catalog.split(RECORD_SEPARATOR).map((record) => {
    const [name, slug, categoryIndexRaw, heightRaw, popularRankRaw, indexedRaw] = record.split(FIELD_SEPARATOR);
    const category = FONT_CATEGORIES[Number(categoryIndexRaw)] as FontCategory | undefined;
    const height = Number(heightRaw);
    const popularRank = popularRankRaw === "" ? null : Number(popularRankRaw);
    if (
      !name
      || !slug
      || !category
      || !Number.isInteger(height)
      || height <= 0
      || (popularRank !== null && (!Number.isInteger(popularRank) || popularRank <= 0))
      || (indexedRaw !== "0" && indexedRaw !== "1")
    ) {
      throw new Error(`Invalid gallery font record: ${record}`);
    }

    return {
      name,
      slug,
      assetPath: `fonts/${encodeURIComponent(name)}.flf`,
      category,
      height,
      popularRank,
      indexed: indexedRaw === "1",
    };
  });
};
