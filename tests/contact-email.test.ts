import { describe, expect, it } from "vitest";
import { parseContactEmail } from "../src/lib/contact-email";

describe("contact email configuration", () => {
  it("normalizes a valid configured address", () => {
    expect(parseContactEmail("  contact@asciibanner.dev  ")).toBe("contact@asciibanner.dev");
  });

  it.each([undefined, "", "not-an-email", "contact@localhost", "contact @example.com"])(
    "rejects an invalid configured value: %s",
    (value) => {
      expect(() => parseContactEmail(value)).toThrow(/CONTACT_EMAIL/);
    },
  );
});
