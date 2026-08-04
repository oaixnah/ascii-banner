import { describe, expect, it } from "vitest";
import { assessFontRedistribution } from "../src/lib/font-license";

describe("font redistribution assessment", () => {
  it("accepts fonts shipped under the figlet.js package license when the header has no conflict", () => {
    expect(assessFontRedistribution("Standard font by Glenn Chappell")).toEqual({
      allowed: true,
      reason: expect.stringContaining("figlet.js"),
    });
  });

  it.each([
    "Ported to figlet and slightly changed (without permission :-})",
    "Derived from a copyrighted program by its original author",
    "copyright 1993, RSA Laboratories",
  ])("rejects an explicit conflicting notice: %s", (notice) => {
    expect(assessFontRedistribution(notice).allowed).toBe(false);
  });
});
