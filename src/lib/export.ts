import { colorAtPosition, DEFAULT_COLOR_SETTINGS, resolveColorStops } from "./color";
import type { ColorSettings, ExportFormat } from "./types";

export const measureOutput = (output: string) => {
  const lines = output.replace(/\n$/, "").split("\n");
  return {
    columns: Math.max(0, ...lines.map((line) => Array.from(line).length)),
    rows: output ? lines.length : 0,
  };
};

const markdownFence = (value: string) => {
  const longestRun = Math.max(0, ...(value.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longestRun + 1));
};

const ANSI_RESET = "\u001b[0m";
const ansiColor = ({ red, green, blue }: ReturnType<typeof colorAtPosition>) => `\u001b[38;2;${red};${green};${blue}m`;

export const formatAnsiExport = (output: string, settings: ColorSettings) => {
  const clean = output.replace(/\s+$/, "");
  const stops = resolveColorStops(settings);
  if (!clean || !stops.length) return clean;

  const lines = clean.split("\n");
  const columns = Math.max(1, ...lines.map((line) => Array.from(line).length));
  return lines.map((line) => {
    if (!line) return line;
    if (stops.length === 1) return `${ansiColor(colorAtPosition(stops, 0))}${line}${ANSI_RESET}`;

    let colored = "";
    let activeColor = "";
    Array.from(line).forEach((character, column) => {
      if (character === " ") {
        colored += character;
        return;
      }
      const nextColor = ansiColor(colorAtPosition(stops, columns === 1 ? 0 : column / (columns - 1)));
      if (nextColor !== activeColor) {
        colored += nextColor;
        activeColor = nextColor;
      }
      colored += character;
    });
    return activeColor ? `${colored}${ANSI_RESET}` : colored;
  }).join("\n");
};

export const formatExport = (output: string, format: ExportFormat, color = DEFAULT_COLOR_SETTINGS) => {
  const clean = output.replace(/\s+$/, "");
  switch (format) {
    case "ansi":
      return formatAnsiExport(clean, color);
    case "markdown": {
      const fence = markdownFence(clean);
      return `${fence}text\n${clean}\n${fence}`;
    }
    case "c-block":
      return `/*\n${clean.replaceAll("*/", "* /")}\n*/`;
    case "hash-comment":
      return clean
        .split("\n")
        .map((line) => `# ${line}`.trimEnd())
        .join("\n");
    case "html-comment":
      return `<!--\n${clean.replaceAll("--", "- -")}\n-->`;
    case "plain":
    default:
      return clean;
  }
};
