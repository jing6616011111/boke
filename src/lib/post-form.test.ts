import { describe, expect, it } from "vitest";
import { parseTagInput } from "./post-form";

describe("parseTagInput", () => {
  it("normalizes comma, Chinese comma, hash prefixes, and duplicate tags", () => {
    expect(parseTagInput(" Next.js, #VPS，随笔  Next.js ")).toEqual([
      "Next.js",
      "VPS",
      "随笔",
    ]);
  });
});
