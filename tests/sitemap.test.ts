import { describe, expect, it } from "vitest";
import { indexedFonts } from "../src/lib/font-data";
import { createSitemapXml, sitemapPaths } from "../src/lib/sitemap";

describe("sitemap generation", () => {
  it("uses the configured site origin for every URL", () => {
    const xml = createSitemapXml(new URL("https://example.test"));
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(locations).toHaveLength(sitemapPaths.length);
    expect(locations.every((location) => location.startsWith("https://example.test/"))).toBe(true);
    expect(locations).toContain("https://example.test/");
    expect(locations).toContain("https://example.test/fonts/");
    expect(locations).toContain("https://example.test/zh/");
    expect(locations).toContain("https://example.test/zh/fonts/");
  });

  it("includes both languages only for editorially indexed fonts", () => {
    for (const font of indexedFonts) {
      expect(sitemapPaths).toContain(`/fonts/${font.slug}/`);
      expect(sitemapPaths).toContain(`/zh/fonts/${font.slug}/`);
    }

    expect(sitemapPaths.some((pathname) => pathname.includes("/fonts/1row/"))).toBe(false);
  });
});
