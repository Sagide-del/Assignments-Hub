import { createHash } from "crypto";
import { AiProvider } from "@prisma/client";

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`,
      );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: Buffer | string | unknown): string {
  const payload =
    Buffer.isBuffer(value) || typeof value === "string"
      ? value
      : stableStringify(value);
  return createHash("sha256").update(payload).digest("hex");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2_000);
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function providerFromModel(model: string): AiProvider | null {
  const normalized = model.toLowerCase();
  if (normalized.includes("gpt") || normalized.includes("openai"))
    return AiProvider.OPENAI;
  // DEEPSEEK/CLAUDE stay recognized here even though nothing generates them
  // anymore, so historical AiGenerationJob rows re-processed or re-read
  // through this helper still classify correctly.
  if (normalized.includes("deepseek")) return AiProvider.DEEPSEEK;
  if (normalized.includes("claude")) return AiProvider.CLAUDE;
  return null;
}

export function envEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}
