import { describe, expect, it } from "vitest";
import {
  analyticsPageLocation,
  parseAnalyticsConfig,
  parseAnalyticsConsent,
  serializeAnalyticsConsent,
  shouldLoadClarity,
} from "../src/lib/analytics";

describe("analytics configuration and privacy", () => {
  it("normalizes valid provider IDs", () => {
    expect(parseAnalyticsConfig("g-abcd1234", "Clarity123")).toEqual({
      gaMeasurementId: "G-ABCD1234",
      clarityProjectId: "clarity123",
    });
  });

  it.each([
    ["UA-123", "clarity123"],
    ["G-ABC", "clarity123"],
    ["G-ABCD1234", "bad-project!"],
  ])("rejects invalid provider IDs", (gaId, clarityId) => {
    expect(() => parseAnalyticsConfig(gaId, clarityId)).toThrow();
  });

  it("defaults to analytics enabled when no choice is stored", () => {
    expect(parseAnalyticsConsent(null)).toBe("granted");
    expect(parseAnalyticsConsent("broken")).toBe("granted");
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("granted"))).toBe("granted");
  });

  it("keeps an opt-out until it is cleared, regardless of age or version", () => {
    const oldDecision = Date.now() - 365 * 24 * 60 * 60 * 1000;
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("denied", oldDecision))).toBe("denied");
    expect(parseAnalyticsConsent(`{"version":1,"status":"denied","decidedAt":${oldDecision}}`)).toBe("denied");
  });

  it("removes query strings and fragments from analytics page locations", () => {
    const url = new URL("https://asciibanner.dev/zh/?text=PRIVATE%20TEXT&width=100#gallery");
    expect(analyticsPageLocation(url)).toBe("https://asciibanner.dev/zh/");
  });

  it("disables Clarity on URLs that contain shared banner text", () => {
    expect(shouldLoadClarity(new URL("https://asciibanner.dev/?text=PRIVATE"))).toBe(false);
    expect(shouldLoadClarity(new URL("https://asciibanner.dev/?width=100"))).toBe(true);
  });
});
