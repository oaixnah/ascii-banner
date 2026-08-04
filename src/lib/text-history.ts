import { sanitizeAsciiText } from "./share";

export const TEXT_HISTORY_STORAGE_KEY = "ascii-banner:text-history";
export const TEXT_HISTORY_VERSION = 1;
export const TEXT_HISTORY_LIMIT = 10;

export interface TextHistoryState {
  version: number;
  items: string[];
}

const normalizeHistoryItem = (value: unknown) => {
  if (typeof value !== "string") return null;
  const sanitized = sanitizeAsciiText(value);
  if (sanitized !== value || !sanitized.trim()) return null;
  return sanitized;
};

const normalizeHistoryItems = (values: unknown[]) => {
  const items: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const item = normalizeHistoryItem(value);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    items.push(item);
    if (items.length >= TEXT_HISTORY_LIMIT) break;
  }
  return items;
};

export const emptyTextHistory = (): TextHistoryState => ({
  version: TEXT_HISTORY_VERSION,
  items: [],
});

export const parseTextHistory = (raw: string | null): TextHistoryState => {
  if (!raw) return emptyTextHistory();
  try {
    const value = JSON.parse(raw) as Partial<TextHistoryState>;
    if (value.version !== TEXT_HISTORY_VERSION || !Array.isArray(value.items)) return emptyTextHistory();
    return { version: TEXT_HISTORY_VERSION, items: normalizeHistoryItems(value.items) };
  } catch {
    return emptyTextHistory();
  }
};

export const serializeTextHistory = (items: string[]) => JSON.stringify({
  version: TEXT_HISTORY_VERSION,
  items: normalizeHistoryItems(items),
} satisfies TextHistoryState);

export const addTextHistoryItem = (items: string[], value: string) => {
  const item = normalizeHistoryItem(value);
  if (!item) return normalizeHistoryItems(items);
  return normalizeHistoryItems([item, ...items.filter((existing) => existing !== item)]);
};

export const removeTextHistoryItem = (items: string[], value: string) => (
  normalizeHistoryItems(items.filter((item) => item !== value))
);
