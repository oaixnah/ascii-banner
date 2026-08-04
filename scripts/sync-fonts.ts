import { chmod, copyFile, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import figlet from "figlet";
import { assessFontRedistribution } from "../src/lib/font-license.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "node_modules", "figlet", "fonts");
const targetDir = path.join(root, "public", "fonts");
const dataDir = path.join(root, "src", "data");

const popularFonts = [
  "Standard",
  "ANSI Shadow",
  "Slant",
  "Big",
  "Doom",
  "Banner3",
  "Block",
  "Colossal",
  "Ghost",
  "Graffiti",
  "3D-ASCII",
  "Bloody",
  "Isometric1",
  "Small",
  "Shadow",
  "Star Wars",
  "Sub-Zero",
  "Speed",
  "Epic",
  "Ogre",
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const categoryFor = (name: string, height: number) => {
  const lower = name.toLowerCase();
  if (/3d|3-d|isometric|relief|emboss/.test(lower)) return "3d";
  if (/script|cursive|call?igraphy|fraktur|italic/.test(lower)) return "script";
  if (/block|banner|doom|big|colossal|chunky|thick/.test(lower)) return "block";
  if (height <= 4 || /small|mini|thin|compact|tiny|term/.test(lower)) return "compact";
  return "novelty";
};

const parseFont = (name: string, content: string) => {
  const lines = content.split(/\r?\n/);
  const header = lines[0]?.trim().split(/\s+/) ?? [];
  const height = Number(header[1]) || 0;
  const maxLength = Number(header[3]) || 0;
  const commentLines = Number(header[5]) || 0;
  const comments = lines.slice(1, 1 + commentLines).map((line) => line.trim()).filter(Boolean);
  return {
    height,
    maxLength,
    headerComment: comments.join("\n"),
    attribution: comments[0] || `${name} FIGlet font`,
  };
};

await mkdir(targetDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".flf"));
const usedSlugs = new Set<string>();
const copiedFiles = new Set<string>();
const excludedFonts: string[] = [];
const manifest = [];

for (const file of files) {
  const name = file.slice(0, -4);
  const source = path.join(sourceDir, file);
  const content = await readFile(source, "utf8");
  const metrics = parseFont(name, content);
  const redistribution = assessFontRedistribution(metrics.headerComment);
  if (!redistribution.allowed) {
    excludedFonts.push(`${name} (${redistribution.reason})`);
    continue;
  }
  try {
    figlet.parseFont(name, content);
    const sample = figlet.textSync("TEST", { font: name as never, width: 120 });
    if (!sample.trim()) throw new Error("no printable ASCII output");
  } catch (error) {
    excludedFonts.push(`${name} (${error instanceof Error ? error.message : "render failed"})`);
    continue;
  }
  const baseSlug = slugify(name) || "font";
  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
  usedSlugs.add(slug);

  const target = path.join(targetDir, file);
  await copyFile(source, target);
  await chmod(target, 0o644);
  copiedFiles.add(file);
  const popularRank = popularFonts.indexOf(name as (typeof popularFonts)[number]);
  manifest.push({
    name,
    slug,
    assetPath: `fonts/${encodeURIComponent(file)}`,
    category: categoryFor(name, metrics.height),
    height: metrics.height,
    maxLength: metrics.maxLength,
    attribution: metrics.attribution,
    popularRank: popularRank === -1 ? null : popularRank + 1,
    indexed: popularRank !== -1,
  });
}

for (const existing of await readdir(targetDir)) {
  if (existing.endsWith(".flf") && !copiedFiles.has(existing)) {
    await unlink(path.join(targetDir, existing));
  }
}

manifest.sort((a, b) => {
  if (a.popularRank && b.popularRank) return a.popularRank - b.popularRank;
  if (a.popularRank) return -1;
  if (b.popularRank) return 1;
  return a.name.localeCompare(b.name);
});

await writeFile(
  path.join(dataDir, "font-manifest.generated.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Synced ${manifest.length} FIGlet fonts.`);
if (excludedFonts.length) console.log(`Excluded ${excludedFonts.length}: ${excludedFonts.join(", ")}`);
