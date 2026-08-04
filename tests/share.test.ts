import { describe, expect, it } from "vitest";
import { buildShareQuery, DEFAULT_SHARE_STATE, parseShareState, sanitizeAsciiText } from "../src/lib/share";

describe("share state", () => {
  it("removes characters unsupported by FIGlet fonts", () => {
    expect(sanitizeAsciiText("Hello 世界!\nNext")).toBe("Hello ! Next");
  });
  it("parses valid state", () => {
    const result = parseShareState(new URLSearchParams("text=Ship%20It&width=100&layout=fitted&color=custom&colorKind=gradient&colorStart=112233&colorEnd=AABBCC"));
    expect(result).toEqual({
      text: "Ship It",
      width: 100,
      layout: "fitted",
      color: { preset: "custom", kind: "gradient", start: "#112233", end: "#AABBCC" },
    });
  });

  it("constrains unsafe or invalid values", () => {
    const result = parseShareState(new URLSearchParams(`text=${"x".repeat(50)}%0Asecret&width=900&layout=wrong`));
    expect(result.text).toHaveLength(40);
    expect(result.width).toBe(DEFAULT_SHARE_STATE.width);
    expect(result.layout).toBe(DEFAULT_SHARE_STATE.layout);
    expect(result.color).toEqual(DEFAULT_SHARE_STATE.color);
  });

  it("round-trips through a query string", () => {
    const state = {
      text: "Hello & Ship",
      width: 120,
      layout: "full" as const,
      color: { preset: "custom" as const, kind: "gradient" as const, start: "#22D3EE", end: "#8B5CF6" },
    };
    expect(parseShareState(new URLSearchParams(buildShareQuery(state)))).toEqual(state);
  });

  it("always serializes mono but omits inactive custom color parameters", () => {
    const query = buildShareQuery(DEFAULT_SHARE_STATE);
    expect(query).toContain("color=mono");
    expect(query).not.toContain("colorStart");
    expect(query).not.toContain("colorEnd");
  });

  it("rejects invalid color settings without affecting the other shared state", () => {
    const result = parseShareState(new URLSearchParams("text=Safe&width=100&layout=full&color=unknown&colorKind=nope&colorStart=red&colorEnd=12345G"));
    expect(result.color).toEqual(DEFAULT_SHARE_STATE.color);
    expect(result.text).toBe("Safe");
    expect(result.width).toBe(100);
  });
});
