import { describe, expect, it } from "vitest";
import { fonts } from "../src/lib/font-data";
import { packGalleryFonts, unpackGalleryFonts } from "../src/lib/gallery-fonts";

describe("gallery font catalog", () => {
  it("round-trips the complete gallery without verbose manifest fields", () => {
    const catalog = packGalleryFonts(fonts);
    const unpacked = unpackGalleryFonts(catalog);

    expect(unpacked).toEqual(fonts.map((font) => ({
      name: font.name,
      slug: font.slug,
      assetPath: font.assetPath,
      category: font.category,
      height: font.height,
      popularRank: font.popularRank,
      indexed: font.indexed,
    })));
    expect(Buffer.byteLength(catalog)).toBeLessThan(10_000);
  });

  it("rejects malformed records", () => {
    expect(() => unpackGalleryFonts("Broken\tfont\t99\t0\tbad\t2")).toThrow("Invalid gallery font record");
  });
});
