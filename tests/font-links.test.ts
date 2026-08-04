import { describe, expect, it } from "vitest";
import { fontDetailPath } from "../src/lib/font-links";
import type { FontManifestEntry } from "../src/lib/types";

const font = (slug: string, indexed: boolean): FontManifestEntry => ({
  name: slug,
  slug,
  assetPath: `/fonts/${slug}.flf`,
  category: "novelty",
  height: 6,
  maxLength: 80,
  attribution: "Test fixture",
  popularRank: indexed ? 1 : null,
  indexed,
});

describe("font detail links", () => {
  it("uses localized pages only when a Chinese detail page exists", () => {
    expect(fontDetailPath(font("standard", true), "zh")).toBe("/zh/fonts/standard/");
    expect(fontDetailPath(font("univers", false), "zh")).toBe("/fonts/univers/");
  });

  it("always uses the English detail route in the English interface", () => {
    expect(fontDetailPath(font("standard", true), "en")).toBe("/fonts/standard/");
  });
});
