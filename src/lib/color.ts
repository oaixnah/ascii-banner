import type { ColorKind, ColorPreset, ColorSettings } from "./types";

export const COLOR_PRESETS: ColorPreset[] = ["mono", "cyan", "matrix", "sunset", "rainbow", "custom"];
export const COLOR_KINDS: ColorKind[] = ["solid", "gradient"];

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
  preset: "mono",
  kind: "solid",
  start: "#22D3EE",
  end: "#8B5CF6",
};

const PRESET_STOPS: Record<Exclude<ColorPreset, "mono" | "custom">, string[]> = {
  cyan: ["#22D3EE"],
  matrix: ["#22C55E", "#86EFAC"],
  sunset: ["#FB7185", "#F59E0B"],
  rainbow: ["#F43F5E", "#F59E0B", "#22C55E", "#06B6D4", "#8B5CF6"],
};

const HEX_COLOR = /^#[0-9A-F]{6}$/;

export const isColorPreset = (value: unknown): value is ColorPreset =>
  typeof value === "string" && COLOR_PRESETS.includes(value as ColorPreset);

export const isColorKind = (value: unknown): value is ColorKind =>
  typeof value === "string" && COLOR_KINDS.includes(value as ColorKind);

export const sanitizeHexColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.startsWith("#") ? value.toUpperCase() : `#${value.toUpperCase()}`;
  return HEX_COLOR.test(normalized) ? normalized : fallback;
};

export const sanitizeColorSettings = (value: Partial<ColorSettings> | null | undefined): ColorSettings => ({
  preset: isColorPreset(value?.preset) ? value.preset : DEFAULT_COLOR_SETTINGS.preset,
  kind: isColorKind(value?.kind) ? value.kind : DEFAULT_COLOR_SETTINGS.kind,
  start: sanitizeHexColor(value?.start, DEFAULT_COLOR_SETTINGS.start),
  end: sanitizeHexColor(value?.end, DEFAULT_COLOR_SETTINGS.end),
});

export const resolveColorStops = (settings: ColorSettings) => {
  const clean = sanitizeColorSettings(settings);
  if (clean.preset === "mono") return [];
  if (clean.preset === "custom") return clean.kind === "solid" ? [clean.start] : [clean.start, clean.end];
  return PRESET_STOPS[clean.preset];
};

export const buildColorGradient = (settings: ColorSettings) => {
  const stops = resolveColorStops(settings);
  if (!stops.length) return "none";
  if (stops.length === 1) return `linear-gradient(90deg, ${stops[0]}, ${stops[0]})`;
  const values = stops.map((color, index) => `${color} ${(index / (stops.length - 1)) * 100}%`);
  return `linear-gradient(90deg, ${values.join(", ")})`;
};

export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export const hexToRgb = (value: string): RgbColor => {
  const clean = sanitizeHexColor(value, DEFAULT_COLOR_SETTINGS.start).slice(1);
  return {
    red: Number.parseInt(clean.slice(0, 2), 16),
    green: Number.parseInt(clean.slice(2, 4), 16),
    blue: Number.parseInt(clean.slice(4, 6), 16),
  };
};

const mixChannel = (start: number, end: number, amount: number) => Math.round(start + (end - start) * amount);

export const colorAtPosition = (stops: string[], position: number): RgbColor => {
  const colors = stops.map(hexToRgb);
  if (colors.length <= 1) return colors[0] ?? hexToRgb(DEFAULT_COLOR_SETTINGS.start);
  const bounded = Math.min(1, Math.max(0, position));
  const scaled = bounded * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const amount = scaled - index;
  return {
    red: mixChannel(colors[index].red, colors[index + 1].red, amount),
    green: mixChannel(colors[index].green, colors[index + 1].green, amount),
    blue: mixChannel(colors[index].blue, colors[index + 1].blue, amount),
  };
};
