import figlet from "figlet";
import { describe, expect, it } from "vitest";
import { fonts, indexedFonts } from "../src/lib/font-data";

describe("font manifest", () => {
  it("contains unique names, slugs, and asset paths", () => {
    expect(fonts.length).toBeGreaterThan(300);
    expect(new Set(fonts.map((font) => font.name)).size).toBe(fonts.length);
    expect(new Set(fonts.map((font) => font.slug)).size).toBe(fonts.length);
    expect(new Set(fonts.map((font) => font.assetPath)).size).toBe(fonts.length);
    expect(indexedFonts).toHaveLength(20);
    expect(fonts.map((font) => font.name)).not.toEqual(expect.arrayContaining([
      "3x5",
      "Letters",
      "Santa Clara",
      "Tombstone",
    ]));
  });

  it("renders every bundled font without taking down the collection", () => {
    const failures: string[] = [];
    for (const font of fonts) {
      try {
        const output = figlet.textSync("TEST", { font: font.name as never, width: 120 });
        if (!output.trim()) failures.push(`${font.name}: empty output`);
      } catch (error) {
        failures.push(`${font.name}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
