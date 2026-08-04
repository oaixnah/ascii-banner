import { describe, expect, it } from "vitest";
import {
  orderFontsForBackground,
  takeUnscheduledSlugs,
} from "../src/lib/render-scheduler";
import type { FontManifestEntry } from "../src/lib/types";

const font = (name: string, popularRank: number | null): FontManifestEntry => ({
  name,
  slug: name.toLowerCase(),
  assetPath: `/fonts/${name}.flf`,
  category: "block",
  height: 6,
  maxLength: 80,
  attribution: "Test fixture",
  popularRank,
  indexed: true,
});

describe("render scheduler", () => {
  it("orders ranked fonts first and keeps the remainder alphabetical", () => {
    const ordered = orderFontsForBackground([
      font("Zulu", null),
      font("Second", 2),
      font("Alpha", null),
      font("First", 1),
    ]);
    expect(ordered.map((entry) => entry.slug)).toEqual(["first", "second", "alpha", "zulu"]);
  });

  it("takes only unscheduled work up to the idle chunk limit", () => {
    expect(takeUnscheduledSlugs(
      ["first", "second", "third", "fourth"],
      new Set(["second"]),
      2,
    )).toEqual(["first", "third"]);
  });
});
