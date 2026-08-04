import type { APIRoute } from "astro";
import { createSitemapXml } from "../lib/sitemap";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("Astro site URL is required to generate sitemap.xml.");

  return new Response(createSitemapXml(site), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
