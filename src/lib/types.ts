export const FONT_CATEGORIES = ["compact", "block", "3d", "script", "novelty"] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];
export type HorizontalLayout = "default" | "fitted" | "full";
export type RenderPriority = "high" | "background";
export type ExportFormat = "plain" | "ansi" | "markdown" | "c-block" | "hash-comment" | "html-comment";
export type ColorPreset = "mono" | "cyan" | "matrix" | "sunset" | "rainbow" | "custom";
export type ColorKind = "solid" | "gradient";

export interface ColorSettings {
  preset: ColorPreset;
  kind: ColorKind;
  start: string;
  end: string;
}

export interface GalleryFontEntry {
  name: string;
  slug: string;
  assetPath: string;
  category: FontCategory;
  height: number;
  popularRank: number | null;
  indexed: boolean;
}

export interface FontManifestEntry extends GalleryFontEntry {
  maxLength: number;
  attribution: string;
}

export interface RenderParameters {
  version: number;
  text: string;
  width: number;
  layout: HorizontalLayout;
}

export interface RenderRequest extends RenderParameters {
  type: "render";
  fontSlugs: string[];
  priority: RenderPriority;
}

export interface RenderResult {
  fontSlug: string;
  output: string;
  columns: number;
  rows: number;
  error?: string;
}

export interface ShareState {
  text: string;
  width: number;
  layout: HorizontalLayout;
  color: ColorSettings;
}

export type WorkerRequest =
  | { type: "init"; fonts: GalleryFontEntry[]; baseUrl: string }
  | { type: "cancel"; version: number }
  | RenderRequest
  | { type: "retry"; fontSlug: string; request: RenderParameters };

export type WorkerResponse =
  | { type: "ready" }
  | { type: "batch"; version: number; results: RenderResult[] }
  | { type: "complete"; version: number };
