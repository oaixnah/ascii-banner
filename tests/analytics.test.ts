import { describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT_MAX_AGE_MS,
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

  it("round-trips a versioned consent choice and rejects stale data", () => {
    const now = 1_800_000_000_000;
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("granted", now), now)).toBe("granted");
    expect(parseAnalyticsConsent(`{"version":1,"status":"granted","decidedAt":${now}}`, now)).toBeNull();
    expect(parseAnalyticsConsent("broken")).toBeNull();
  });

  it("expires granted and denied choices after 15 days", () => {
    const now = 1_800_000_000_000;
    const stillValid = now - ANALYTICS_CONSENT_MAX_AGE_MS + 1;
    const expired = now - ANALYTICS_CONSENT_MAX_AGE_MS;

    expect(parseAnalyticsConsent(serializeAnalyticsConsent("granted", stillValid), now)).toBe("granted");
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("denied", stillValid), now)).toBe("denied");
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("granted", expired), now)).toBeNull();
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("denied", expired), now)).toBeNull();
    expect(parseAnalyticsConsent(serializeAnalyticsConsent("denied", now + 1), now)).toBeNull();
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
