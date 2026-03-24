type FormatSpeechBubbleTextParams = {
  text: string;
  maxCharsPerLine: number;
  maxLines: number;
};

type FormatSpeechBubbleTextResult = {
  lines: string[];
  text: string;
  truncated: boolean;
};

function chunkLine(text: string, maxCharsPerLine: number): string[] {
  const chars = Array.from(text);
  if (chars.length === 0) return [""];

  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += maxCharsPerLine) {
    lines.push(chars.slice(index, index + maxCharsPerLine).join(""));
  }
  return lines;
}

export function formatSpeechBubbleText({
  text,
  maxCharsPerLine,
  maxLines,
}: FormatSpeechBubbleTextParams): FormatSpeechBubbleTextResult {
  const safeMaxCharsPerLine = Math.max(1, Math.floor(maxCharsPerLine));
  const safeMaxLines = Math.max(1, Math.floor(maxLines));
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return { lines: [""], text: "", truncated: false };
  }

  const wrappedLines = normalized
    .split("\n")
    .flatMap((line) => chunkLine(line.trim(), safeMaxCharsPerLine))
    .filter((line, index, lines) => line.length > 0 || (index === 0 && lines.length === 1));

  if (wrappedLines.length <= safeMaxLines) {
    return {
      lines: wrappedLines,
      text: wrappedLines.join("\n"),
      truncated: false,
    };
  }

  const visibleLines = wrappedLines.slice(0, safeMaxLines);
  const lastLineChars = Array.from(visibleLines[safeMaxLines - 1] ?? "");
  const trimmedLastLine = lastLineChars.slice(0, Math.max(0, safeMaxCharsPerLine - 1)).join("");
  visibleLines[safeMaxLines - 1] = `${trimmedLastLine}…`;

  return {
    lines: visibleLines,
    text: visibleLines.join("\n"),
    truncated: true,
  };
}
