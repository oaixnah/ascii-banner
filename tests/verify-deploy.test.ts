import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyDeployOutput } from "../scripts/verify-deploy";

const temporaryDirectories: string[] = [];
const siteUrl = "https://example.test";

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

  it.each(["index.html", "404.html", "robots.txt", "sitemap.xml"])(
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
});
