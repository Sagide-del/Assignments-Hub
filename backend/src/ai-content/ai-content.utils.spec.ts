import { AiProvider } from "@prisma/client";
import {
  envEnabled,
  providerFromModel,
  sha256,
  stableStringify,
} from "./ai-content.utils";

describe("ai-content utilities", () => {
  it("creates the same hash for objects with different key order", () => {
    const left = { grade: "Grade 7", subject: "Mathematics", count: 10 };
    const right = { count: 10, subject: "Mathematics", grade: "Grade 7" };

    expect(stableStringify(left)).toBe(stableStringify(right));
    expect(sha256(left)).toBe(sha256(right));
  });

  it("keeps feature flags disabled unless explicitly enabled", () => {
    expect(envEnabled(undefined)).toBe(false);
    expect(envEnabled("false")).toBe(false);
    expect(envEnabled(" true ")).toBe(true);
  });

  it("identifies supported providers without guessing unknown models", () => {
    expect(providerFromModel("deepseek-chat")).toBe(AiProvider.DEEPSEEK);
    expect(providerFromModel("claude-sonnet-4")).toBe(AiProvider.CLAUDE);
    expect(providerFromModel("unknown-model")).toBeNull();
  });
});
