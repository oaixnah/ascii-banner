import { describe, expect, it } from "vitest";
import {
  TOUR_VERSION,
  parseTourState,
  serializeTourState,
} from "../src/lib/tour";

describe("product tour state", () => {
  it("round-trips dismissed and completed states", () => {
    expect(parseTourState(serializeTourState("dismissed"))).toEqual({
      version: TOUR_VERSION,
      status: "dismissed",
    });
    expect(parseTourState(serializeTourState("completed"))).toEqual({
      version: TOUR_VERSION,
      status: "completed",
    });
  });

  it("treats malformed, stale, and unsupported states as new users", () => {
    expect(parseTourState(null)).toBeNull();
    expect(parseTourState("not-json")).toBeNull();
    expect(parseTourState(JSON.stringify({ version: TOUR_VERSION - 1, status: "completed" }))).toBeNull();
    expect(parseTourState(JSON.stringify({ version: TOUR_VERSION, status: "started" }))).toBeNull();
  });
});
