import { describe, expect, it } from "vitest";

import { formatSpeechBubbleText } from "@/features/retro-office/core/speechBubbleText";

describe("formatSpeechBubbleText", () => {
  it("wraps long chinese text to at most three lines with ellipsis", () => {
    const result = formatSpeechBubbleText({
      text: "在的！有什么需要帮忙的吗？这里有一段比较长的说明文字，用来验证气泡文本会自动换行，并且在超过三行后用省略号截断显示。",
      maxCharsPerLine: 8,
      maxLines: 3,
    });

    expect(result.lines).toHaveLength(3);
    expect(result.text.split("\n")).toHaveLength(3);
    expect(result.text.endsWith("…")).toBe(true);
  });

  it("keeps short text on a single line", () => {
    const result = formatSpeechBubbleText({
      text: "在的！",
      maxCharsPerLine: 8,
      maxLines: 3,
    });

    expect(result.lines).toEqual(["在的！"]);
    expect(result.text).toBe("在的！");
    expect(result.truncated).toBe(false);
  });
});
