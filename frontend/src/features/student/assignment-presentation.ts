/** Display-only title breakdown. Never changes grouping, search, stored titles or routes. */
export function learningTitle(value: string, subject = "") {
  const full = value.trim();
  let text = full;
  const batch = text.match(/(?:\s*[·•|–—-]\s*|\s+)Batch\s+(\d+)\s*$/i)?.[1];
  if (batch)
    text = text.replace(/(?:\s*[·•|–—-]\s*|\s+)Batch\s+\d+\s*$/i, "").trim();
  const escaped = subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (escaped)
    text = text.replace(new RegExp(`^${escaped}\\s*[:·•|–—-]\\s*`, "i"), "");
  const parts = text.split(/\s*[·•|]\s*/).filter(Boolean);
  const hierarchy = (parts.shift() ?? text).split(/\s+\/\s*/).filter(Boolean);
  const primary = hierarchy.pop() ?? text;
  const code = primary.match(/^(\d+(?:\.\d+)+)\s+(?=\S)/)?.[1];
  const title = (code ? primary.slice(code.length).trim() : primary) || full;
  return {
    title,
    strand: hierarchy.join(" / "),
    code,
    coverage: parts,
    batch,
    full,
  };
}
