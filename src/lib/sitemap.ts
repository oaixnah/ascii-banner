import { guides } from "../data/guides";
import { guidesZh } from "../data/guides-zh";
import { indexedFonts } from "./font-data";

const staticPaths = [
  "/",
  "/about/",
  "/contact/",
  "/privacy/",
  "/terms/",
  "/zh/",
  "/zh/about/",
  "/zh/contact/",
  "/zh/privacy/",
  "/zh/terms/",
] as const;

export const sitemapPaths = [
  ...staticPaths,
  ...guides.map((guide) => `/for/${guide.slug}/`),
  ...guidesZh.map((guide) => `/zh/for/${guide.slug}/`),
  ...indexedFonts.flatMap((font) => [`/fonts/${font.slug}/`, `/zh/fonts/${font.slug}/`]),
];

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export const createSitemapXml = (site: URL) => {
  const entries = sitemapPaths
    .map((pathname) => `  <url><loc>${escapeXml(new URL(pathname, site).href)}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};
