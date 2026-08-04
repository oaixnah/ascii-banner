import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REQUIRED_FILES = ["index.html", "404.html", "robots.txt", "sitemap.xml"] as const;
const HOST_SPECIFIC_FILES = ["CNAME", ".nojekyll"] as const;

export interface VerifyDeployOptions {
  siteUrl: string;
  expectedFontAssets?: string[];
}

const isFile = async (filePath: string) => {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
};

const readText = async (filePath: string) => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const extractLocations = (xml: string) => (
  [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1])
);

const resolveOutputPath = (distDir: string, relativePath: string) => {
  const root = path.resolve(distDir);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
};

const routeOutputPath = (pathname: string) => {
  const decoded = decodeURIComponent(pathname);
  if (decoded === "/") return "index.html";
  if (decoded.endsWith("/")) return path.join(decoded.slice(1), "index.html");
  return decoded.slice(1);
};

const normalizeAssetPath = (assetPath: string) => {
  try {
    const decoded = decodeURIComponent(assetPath).replace(/^\/+/, "");
    return decoded || null;
  } catch {
    return null;
  }
};

export const verifyDeployOutput = async (
  distDir: string,
  options: VerifyDeployOptions,
) => {
  const issues: string[] = [];
  const site = new URL(options.siteUrl);
  const canonicalOrigin = site.origin;
  const canonicalSitemap = new URL("/sitemap.xml", site).href;

  for (const requiredFile of REQUIRED_FILES) {
    if (!(await isFile(path.join(distDir, requiredFile)))) {
      issues.push(`Missing required file: ${requiredFile}`);
    }
  }

  for (const hostSpecificFile of HOST_SPECIFIC_FILES) {
    if (await isFile(path.join(distDir, hostSpecificFile))) {
      issues.push(`Host-specific file is not allowed: ${hostSpecificFile}`);
    }
  }

  const robots = await readText(path.join(distDir, "robots.txt"));
  if (robots && !robots.split(/\r?\n/).some((line) => line.trim() === `Sitemap: ${canonicalSitemap}`)) {
    issues.push(`robots.txt must reference ${canonicalSitemap}`);
  }

  const sitemap = await readText(path.join(distDir, "sitemap.xml"));
  const pageLocations = sitemap ? extractLocations(sitemap) : [];
  if (sitemap && pageLocations.length === 0) {
    issues.push("sitemap.xml must contain at least one page URL");
  }

  for (const pageLocation of pageLocations) {
    let pageUrl: URL;
    try {
      pageUrl = new URL(pageLocation);
    } catch {
      issues.push(`Invalid page URL in sitemap.xml: ${pageLocation}`);
      continue;
    }
    if (pageUrl.origin !== canonicalOrigin) {
      issues.push(`Page URL must use ${canonicalOrigin}: ${pageLocation}`);
      continue;
    }
    if (pageUrl.search || pageUrl.hash) {
      issues.push(`Page URL must not contain a query or hash: ${pageLocation}`);
      continue;
    }
    const outputPath = resolveOutputPath(distDir, routeOutputPath(pageUrl.pathname));
    if (!outputPath || !(await isFile(outputPath))) {
      issues.push(`Missing page referenced by sitemap: ${pageUrl.pathname}`);
    }
  }

  for (const assetPath of options.expectedFontAssets ?? []) {
    const normalized = normalizeAssetPath(assetPath);
    const outputPath = normalized ? resolveOutputPath(distDir, normalized) : null;
    if (!outputPath || !(await isFile(outputPath))) {
      issues.push(`Missing font asset: ${assetPath}`);
    }
  }

  if (issues.length) {
    throw new Error(`Deploy verification failed:\n- ${issues.join("\n- ")}`);
  }

  return {
    sitemapCount: sitemap && pageLocations.length > 0 ? 1 : 0,
    fontCount: options.expectedFontAssets?.length ?? 0,
  };
};

const loadExpectedFontAssets = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const manifestPath = path.join(root, "src", "data", "font-manifest.generated.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Array<{ assetPath?: unknown }>;
  return manifest.flatMap((font) => typeof font.assetPath === "string" ? [font.assetPath] : []);
};

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectRun) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const distDir = path.resolve(process.argv[2] ?? path.join(root, "dist"));
  try {
    if (!process.env.SITE_URL) {
      throw new Error("SITE_URL is required to verify deployment output.");
    }
    const expectedFontAssets = await loadExpectedFontAssets();
    const result = await verifyDeployOutput(distDir, {
      siteUrl: process.env.SITE_URL,
      expectedFontAssets,
    });
    console.log(`Deploy output verified: ${result.sitemapCount} sitemap(s), ${result.fontCount} font asset(s).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
