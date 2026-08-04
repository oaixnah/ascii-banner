import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyDeployOutput } from "../scripts/verify-deploy";

const temporaryDirectories: string[] = [];

const createFixture = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ascii-banner-deploy-"));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, "about"), { recursive: true });
  await mkdir(path.join(root, "fonts"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "index.html"), "home"),
    writeFile(path.join(root, "404.html"), "not found"),
    writeFile(path.join(root, "about", "index.html"), "about"),
    writeFile(path.join(root, "fonts", "Standard.flf"), "font"),
    writeFile(path.join(root, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: https://asciibanner.dev/sitemap-index.xml\n"),
    writeFile(
      path.join(root, "sitemap-index.xml"),
      '<sitemapindex><sitemap><loc>https://asciibanner.dev/sitemap-0.xml</loc></sitemap></sitemapindex>',
    ),
    writeFile(
      path.join(root, "sitemap-0.xml"),
      '<urlset><url><loc>https://asciibanner.dev/</loc></url><url><loc>https://asciibanner.dev/about/</loc></url></urlset>',
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
      expectedFontAssets: ["fonts/Standard.flf"],
    })).resolves.toEqual({ sitemapCount: 1, fontCount: 1 });
  });

  it.each(["index.html", "404.html", "robots.txt", "sitemap-index.xml"])(
    "rejects a missing required file: %s",
    async (file) => {
      const root = await createFixture();
      await rm(path.join(root, file));
      await expect(verifyDeployOutput(root)).rejects.toThrow(`Missing required file: ${file}`);
    },
  );

  it("rejects an empty sitemap index and the wrong robots domain", async () => {
    const root = await createFixture();
    await writeFile(path.join(root, "sitemap-index.xml"), "<sitemapindex></sitemapindex>");
    await writeFile(path.join(root, "robots.txt"), "Sitemap: https://example.com/sitemap-index.xml\n");
    await expect(verifyDeployOutput(root)).rejects.toThrow(
      /robots\.txt must reference.*sitemap-index\.xml[\s\S]*must reference at least one sitemap/,
    );
  });

  it.each(["CNAME", ".nojekyll"])("rejects host-specific output: %s", async (file) => {
    const root = await createFixture();
    await writeFile(path.join(root, file), "host-specific");
    await expect(verifyDeployOutput(root)).rejects.toThrow(
      `Host-specific file is not allowed: ${file}`,
    );
  });

  it("rejects missing referenced sitemaps, pages, and font assets", async () => {
    const root = await createFixture();
    await rm(path.join(root, "sitemap-0.xml"));
    await expect(verifyDeployOutput(root, {
      expectedFontAssets: ["fonts/Missing.flf"],
    })).rejects.toThrow(/Missing sitemap referenced by index[\s\S]*Missing font asset/);

    await writeFile(
      path.join(root, "sitemap-0.xml"),
      '<urlset><url><loc>https://asciibanner.dev/missing/</loc></url></urlset>',
    );
    await expect(verifyDeployOutput(root)).rejects.toThrow("Missing page referenced by sitemap: /missing/");
  });

  it("rejects sitemap and page URLs on another origin", async () => {
    const root = await createFixture();
    await writeFile(
      path.join(root, "sitemap-index.xml"),
      '<sitemapindex><sitemap><loc>https://example.com/sitemap-0.xml</loc></sitemap></sitemapindex>',
    );
    await expect(verifyDeployOutput(root)).rejects.toThrow(
      "Sitemap URL must use https://asciibanner.dev",
    );

    await writeFile(
      path.join(root, "sitemap-index.xml"),
      '<sitemapindex><sitemap><loc>https://asciibanner.dev/sitemap-0.xml</loc></sitemap></sitemapindex>',
    );
    await writeFile(
      path.join(root, "sitemap-0.xml"),
      '<urlset><url><loc>https://example.com/</loc></url></urlset>',
    );
    await expect(verifyDeployOutput(root)).rejects.toThrow(
      "Page URL must use https://asciibanner.dev",
    );
  });
});
