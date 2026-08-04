import { describe, expect, it } from "vitest";
import type { ColorSettings } from "../src/lib/types";
import { formatExport, measureOutput } from "../src/lib/export";

describe("measureOutput", () => {
  it("measures the longest line and ignores a trailing newline", () => {
    expect(measureOutput("AB\nABCDE\n")).toEqual({ columns: 5, rows: 2 });
  });

  it("handles empty output", () => {
    expect(measureOutput("")).toEqual({ columns: 0, rows: 0 });
  });
});

describe("formatExport", () => {
  const art = " /\\\n<  >";
  const solid: ColorSettings = { preset: "custom", kind: "solid", start: "#22D3EE", end: "#8B5CF6" };
  const gradient: ColorSettings = { preset: "custom", kind: "gradient", start: "#000000", end: "#FFFFFF" };

  it("returns trimmed raw output", () => {
    expect(formatExport(`${art}\n`, "plain")).toBe(art);
  });

  it("wraps Markdown and expands a conflicting fence", () => {
    expect(formatExport("```\nART", "markdown")).toBe("````text\n```\nART\n````");
  });

  it("prevents an accidental C comment terminator", () => {
    expect(formatExport("A */ B", "c-block")).toBe("/*\nA * / B\n*/");
  });

  it("prefixes every line for hash-comment languages", () => {
    expect(formatExport("A\n B", "hash-comment")).toBe("# A\n#  B");
  });

  it("prevents invalid double hyphens inside HTML comments", () => {
    expect(formatExport("A--B", "html-comment")).toBe("<!--\nA- -B\n-->");
  });

  it("adds one Truecolor code and a reset per non-empty line for a solid color", () => {
    expect(formatExport("A B\nCD", "ansi", solid)).toBe(
      "\u001b[38;2;34;211;238mA B\u001b[0m\n\u001b[38;2;34;211;238mCD\u001b[0m",
    );
  });

  it("interpolates gradients by column while preserving spaces and line alignment", () => {
    expect(formatExport("A B\n C", "ansi", gradient)).toBe(
      "\u001b[38;2;0;0;0mA \u001b[38;2;255;255;255mB\u001b[0m\n \u001b[38;2;128;128;128mC\u001b[0m",
    );
  });

  it("uses every evenly spaced stop in the rainbow preset", () => {
    const rainbow: ColorSettings = { ...solid, preset: "rainbow" };
    const output = formatExport("ABCDE", "ansi", rainbow);
    expect(output).toContain("\u001b[38;2;244;63;94mA");
    expect(output).toContain("\u001b[38;2;245;158;11mB");
    expect(output).toContain("\u001b[38;2;34;197;94mC");
    expect(output).toContain("\u001b[38;2;6;182;212mD");
    expect(output).toContain("\u001b[38;2;139;92;246mE\u001b[0m");
  });

  it("leaves every existing export format free of ANSI escape codes", () => {
    for (const format of ["plain", "markdown", "c-block", "hash-comment", "html-comment"] as const) {
      expect(formatExport(art, format, solid)).not.toContain("\u001b[");
    }
  });
});
