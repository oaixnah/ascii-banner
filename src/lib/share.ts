import { DEFAULT_COLOR_SETTINGS, isColorKind, isColorPreset, sanitizeHexColor } from "./color";
import type { HorizontalLayout, ShareState } from "./types";

export const DEFAULT_SHARE_STATE: ShareState = {
  text: "Hello World",
  width: 80,
  layout: "default",
  color: DEFAULT_COLOR_SETTINGS,
};

const isLayout = (value: string | null): value is HorizontalLayout =>
  value === "default" || value === "fitted" || value === "full";

export const sanitizeAsciiText = (value: string) => value
  .replace(/[\r\n]/g, " ")
  .replace(/[^\x20-\x7E]/g, "")
  .slice(0, 40);

export const parseShareState = (params: URLSearchParams): ShareState => {
  const rawText = params.get("text");
  const rawWidth = Number(params.get("width"));
  const rawLayout = params.get("layout");
  const rawPreset = params.get("color");
  const rawKind = params.get("colorKind");
  return {
    text: rawText ? sanitizeAsciiText(rawText) || DEFAULT_SHARE_STATE.text : DEFAULT_SHARE_STATE.text,
    width: Number.isFinite(rawWidth) && rawWidth >= 40 && rawWidth <= 200 ? rawWidth : DEFAULT_SHARE_STATE.width,
    layout: isLayout(rawLayout) ? rawLayout : DEFAULT_SHARE_STATE.layout,
    color: {
      preset: isColorPreset(rawPreset) ? rawPreset : DEFAULT_COLOR_SETTINGS.preset,
      kind: isColorKind(rawKind) ? rawKind : DEFAULT_COLOR_SETTINGS.kind,
      start: sanitizeHexColor(params.get("colorStart"), DEFAULT_COLOR_SETTINGS.start),
      end: sanitizeHexColor(params.get("colorEnd"), DEFAULT_COLOR_SETTINGS.end),
    },
  };
};

export const buildShareQuery = (state: ShareState) => {
  const params = new URLSearchParams();
  params.set("text", state.text.slice(0, 40));
  params.set("width", String(state.width));
  params.set("layout", state.layout);
  params.set("color", state.color.preset);
  if (state.color.preset === "custom") {
    params.set("colorKind", state.color.kind);
    params.set("colorStart", state.color.start.slice(1));
    if (state.color.kind === "gradient") params.set("colorEnd", state.color.end.slice(1));
  }
  return params.toString();
};
