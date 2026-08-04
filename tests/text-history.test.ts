import { describe, expect, it } from "vitest";
import {
  TEXT_HISTORY_LIMIT,
  TEXT_HISTORY_VERSION,
  addTextHistoryItem,
  parseTextHistory,
  removeTextHistoryItem,
  serializeTextHistory,
} from "../src/lib/text-history";

describe("text history", () => {
  it("parses, serializes, deduplicates, and preserves meaningful spaces", () => {
    const raw = serializeTextHistory(["Hello", "  Padded  ", "Hello"]);
    expect(parseTextHistory(raw)).toEqual({
      version: TEXT_HISTORY_VERSION,
      items: ["Hello", "  Padded  "],
    });
  });

  it("moves an exact match to the front while preserving case", () => {
    expect(addTextHistoryItem(["Alpha", "alpha", "Beta"], "Beta")).toEqual(["Beta", "Alpha", "alpha"]);
  });

  it("rejects empty, whitespace-only, non-ASCII, malformed, and stale data", () => {
    expect(addTextHistoryItem(["Saved"], "   ")).toEqual(["Saved"]);
    expect(addTextHistoryItem(["Saved"], "中文")).toEqual(["Saved"]);
    expect(addTextHistoryItem(["Saved"], "Mixed中文")).toEqual(["Saved"]);
    expect(parseTextHistory("not-json").items).toEqual([]);
    expect(parseTextHistory(JSON.stringify({ version: 0, items: ["Old"] })).items).toEqual([]);
  });

  it("caps history and removes only the requested item", () => {
    const values = Array.from({ length: TEXT_HISTORY_LIMIT + 4 }, (_, index) => `Item ${index}`);
    const capped = parseTextHistory(serializeTextHistory(values)).items;
    expect(capped).toHaveLength(TEXT_HISTORY_LIMIT);
    expect(removeTextHistoryItem(capped, "Item 4")).not.toContain("Item 4");
    expect(removeTextHistoryItem(capped, "Missing")).toEqual(capped);
  });
});
