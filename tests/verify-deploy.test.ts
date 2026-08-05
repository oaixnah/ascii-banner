import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyDeployOutput } from "../scripts/verify-deploy";

const temporaryDirectories: string[] = [];
const siteUrl = "https://example.test";
const pageHtml = (pathname: string, title: string) => `<!doctype html><html><head><meta name="description" content="Description"><meta name="robots" content="index,follow"><link rel="canonical" href="${siteUrl}${pathname}"><script type="application/ld+json">{}</script><title>${title}</title></head><body><h1>${title}</h1></body></html>`;

const createFixture = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ascii-banner-deploy-"));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, "about"), { recursive: true });
  await mkdir(path.join(root, "fonts"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "index.html"), pageHtml("/", "Home")),
    writeFile(path.join(root, "404.html"), "not found"),
    writeFile(path.join(root, "edgeone.json"), "{}"),
    writeFile(path.join(root, "favicon.svg"), "<svg></svg>"),
    writeFile(path.join(root, "og.png"), "image"),
    writeFile(path.join(root, "about", "index.html"), pageHtml("/about/", "About")),
    writeFile(path.join(root, "fonts", "Standard.flf"), "font"),
    writeFile(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`),
    writeFile(
      path.join(root, "sitemap.xml"),
      `<urlset><url><loc>${siteUrl}/</loc></url><url><loc>${siteUrl}/about/</loc></url></urlset>`,
    ),
  ]);
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("deploy output verification", () => {
  it("accepts complete output and reports sitemap and font counts", async () => {
    const root = await createFixture();
    await expect(verifyDeployOutput(root, {
      siteUrl,
      expectedFontAssets: ["fonts/Standard.flf"],
    })).resolves.toEqual({ sitemapCount: 1, fontCount: 1 });
  });

  it.each(["index.html", "404.html", "edgeone.json", "favicon.svg", "og.png", "robots.txt", "sitemap.xml"])(
    "rejects a missing required file: %s",
    async (file) => {
      const root = await createFixture();
      await rm(path.join(root, file));
      await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow(`Missing required file: ${file}`);
    },
  );

  it("rejects an empty sitemap and the wrong robots domain", async () => {
    const root = await createFixture();
    await writeFile(path.join(root, "sitemap.xml"), "<urlset></urlset>");
    await writeFile(path.join(root, "robots.txt"), "Sitemap: https://wrong.example/sitemap.xml\n");
    await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow(
      /robots\.txt must reference.*sitemap\.xml[\s\S]*sitemap\.xml must contain at least one page URL/,
    );
  });

  it.each(["CNAME", ".nojekyll"])("rejects host-specific output: %s", async (file) => {
    const root = await createFixture();
    await writeFile(path.join(root, file), "host-specific");
    await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow(
      `Host-specific file is not allowed: ${file}`,
    );
  });

  it("rejects missing pages and font assets", async () => {
    const root = await createFixture();
    await writeFile(
      path.join(root, "sitemap.xml"),
      `<urlset><url><loc>${siteUrl}/missing/</loc></url></urlset>`,
    );
    await expect(verifyDeployOutput(root, {
      siteUrl,
      expectedFontAssets: ["fonts/Missing.flf"],
    })).rejects.toThrow(/Missing page referenced by sitemap: \/missing\/[\s\S]*Missing font asset/);
  });

  it("rejects page URLs on another origin", async () => {
    const root = await createFixture();
    await writeFile(
      path.join(root, "sitemap.xml"),
      '<urlset><url><loc>https://wrong.example/</loc></url></urlset>',
    );
    await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow(
      `Page URL must use ${siteUrl}`,
    );
  });

  it("rejects sitemap pages with invalid index metadata", async () => {
    const root = await createFixture();
    await writeFile(
      path.join(root, "about", "index.html"),
      '<html><head><meta name="robots" content="noindex,follow"><title>About</title></head><body><h1>One</h1><h1>Two</h1></body></html>',
    );
    await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow(
      /Canonical URL mismatch[\s\S]*Sitemap page must be indexable[\s\S]*Missing meta description[\s\S]*exactly one h1/,
    );
  });

  it("rejects incomplete bilingual hreflang clusters", async () => {
    const root = await createFixture();
    await mkdir(path.join(root, "zh"));
    await writeFile(path.join(root, "zh", "index.html"), pageHtml("/zh/", "首页"));
    await writeFile(
      path.join(root, "sitemap.xml"),
      `<urlset><url><loc>${siteUrl}/</loc></url><url><loc>${siteUrl}/zh/</loc></url></urlset>`,
    );
    await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow("Invalid hreflang cluster");
  });

  it("rejects broken internal links on indexable pages", async () => {
    const root = await createFixture();
    await writeFile(
      path.join(root, "about", "index.html"),
      pageHtml("/about/", "About").replace("</body>", '<a href="/missing/">Missing</a></body>'),
    );
    await expect(verifyDeployOutput(root, { siteUrl })).rejects.toThrow(
      "Broken internal link from /about/: /missing/",
    );
  });
});
