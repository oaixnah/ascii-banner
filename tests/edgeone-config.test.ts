import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { indexedFonts } from "../src/lib/font-data";

interface EdgeOneConfig {
  redirects: Array<{ source: string; destination: string; statusCode: number }>;
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

const loadConfig = async () => JSON.parse(
  await readFile(new URL("../public/edgeone.json", import.meta.url), "utf8"),
) as EdgeOneConfig;

describe("EdgeOne Pages configuration", () => {
  it("permanently redirects clean routes to their canonical trailing-slash URLs", async () => {
    const config = await loadConfig();
    expect(config.redirects).toEqual(expect.arrayContaining([
      { source: "/fonts", destination: "/fonts/", statusCode: 301 },
      { source: "/zh/fonts/:slug", destination: "/zh/fonts/:slug/", statusCode: 301 },
      ...indexedFonts.map((font) => ({
        source: `/fonts/${font.slug}`,
        destination: `/fonts/${font.slug}/`,
        statusCode: 301,
      })),
    ]));
    expect(config.redirects.every((redirect) => redirect.statusCode === 301)).toBe(true);
    expect(config.redirects).toHaveLength(34);
    expect(config.redirects.some((redirect) => redirect.source === "/fonts/:slug")).toBe(false);
  });

  it("serves FIGlet files as compressible text", async () => {
    const config = await loadConfig();
    const fontHeaders = config.headers.find((rule) => rule.source === "/fonts/*.flf")?.headers;
    expect(fontHeaders).toEqual(expect.arrayContaining([
      { key: "Content-Type", value: "text/plain; charset=utf-8" },
      { key: "Cache-Control", value: "public, max-age=2592000" },
    ]));
  });

  it("adds long-lived asset caching and staged security policy headers", async () => {
    const config = await loadConfig();
    const globalHeaders = config.headers.find((rule) => rule.source === "/*")?.headers ?? [];
    expect(globalHeaders).toEqual(expect.arrayContaining([
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      expect.objectContaining({ key: "Content-Security-Policy-Report-Only" }),
    ]));
    expect(config.headers.find((rule) => rule.source === "/_astro/*")?.headers).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    });
  });
});
