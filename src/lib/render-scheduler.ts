import type { FontManifestEntry } from "./types";

export const INITIAL_RENDER_COUNT = 20;
export const BACKGROUND_RENDER_CHUNK = 24;

export const orderFontsForBackground = (fonts: FontManifestEntry[]) => (
  [...fonts].sort((a, b) => {
    if (a.popularRank && b.popularRank) return a.popularRank - b.popularRank;
    if (a.popularRank) return -1;
    if (b.popularRank) return 1;
    return a.name.localeCompare(b.name);
  })
);

export const takeUnscheduledSlugs = (
  orderedSlugs: string[],
  scheduled: ReadonlySet<string>,
  limit: number,
) => {
  const next: string[] = [];
  for (const slug of orderedSlugs) {
    if (scheduled.has(slug)) continue;
    next.push(slug);
    if (next.length >= limit) break;
  }
  return next;
};
