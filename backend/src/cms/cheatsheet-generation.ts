import { validateCmsGeneratedContent } from "./generated-content";
import { validateTheoryCheatsheet } from "./theory-cheatsheet";
/** Preserve already-saved/provider legacy formats; strictly validate the new contract. */
export function validateCheatsheetGeneration(
  value: unknown,
  count = 30,
  profile?: Parameters<typeof validateCmsGeneratedContent>[2],
) {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !Object.prototype.hasOwnProperty.call(raw, "theory_cheatsheet")
  )
    return validateCmsGeneratedContent(value, count, profile);
  if (Object.prototype.hasOwnProperty.call(raw, "theory_text"))
    throw Error("Choose one theory format");
  const { theory_cheatsheet, ...rest } = raw as Record<string, unknown>;
  const sheet = validateTheoryCheatsheet(theory_cheatsheet);
  const theory_text = sheet.key_concepts.join("\n\n");
  const content = validateCmsGeneratedContent({ ...rest, theory_text }, count, {
    ...profile,
    theoryWords: theory_text.split(/\s+/).length,
  });
  return { ...content, theory_cheatsheet: sheet };
}
