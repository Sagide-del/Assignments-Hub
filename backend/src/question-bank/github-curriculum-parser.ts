import { createHash } from "crypto";
import { DocumentMapping, compact, validateMapping } from "./collection-tools";
export interface RepositoryDesign {
  id: string;
  grade: string;
  subject: string;
  path: string;
  sha256: string;
  revision: string;
  sourceUrl: string;
  officialDirectory: string;
}
export function curriculumText(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/^\[[^\]]+\]:\s*<data:[^>]*>\s*$/gm, " ")
    .replace(
      /<\/?(?:br|p|span|div|sup|sub|strong|em|b|i|a|img|table|tr|td|th)\b[^>]*>/gi,
      " ",
    )
    .replace(/\\([|*_\-()[\]])/g, "$1")
    .replace(/\*\*|__/g, "")
    .replace(/(?<!\w)\*([^*|\n]+)\*(?!\w)/g, "$1")
    .replace(/(?<!\w)_([^_|\n]+)_(?!\w)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}
function cells(line: string) {
  const parts: string[] = [];
  let part = "";
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\" && line[i + 1] === "|") {
      part += "|";
      i++;
    } else if (line[i] === "|") {
      parts.push(part);
      part = "";
    } else part += line[i];
  }
  parts.push(part);
  if (!parts[0].trim()) parts.shift();
  if (!parts.at(-1)?.trim()) parts.pop();
  return parts.map((s) => compact(curriculumText(s)));
}
const outcomeHeader = (s: string) =>
  /specific learning.*outcome|matokeo.*(?:maalum|mahususi|yanayotarajiwa)|malengo.*mahususi/i.test(
    s,
  );
const numeric = (s: string) => /^\d+(?:\.\d+)*(?:\b|[.)])/.test(s);
function splitOutcomes(text: string) {
  // Keep every extracted piece an exact substring of the cleaned source.
  const starts = [...text.matchAll(/(?:^|\s)(?:[a-z]\)|[a-z]\.)(?=\s)/gi)];
  if (starts.length > 1)
    return starts
      .map((m, i) =>
        text
          .slice(m.index! + m[0].length, starts[i + 1]?.index ?? text.length)
          .trim(),
      )
      .filter(Boolean);
  const bullets = text
    .split(/\s*[•●]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bullets.length > 1)
    return bullets.filter(
      (s) => !/^by the end|^kufikia mwisho|^ifikapo mwisho/i.test(s),
    );
  return [text.trim()];
}
export function parseRepositoryDesign(
  markdown: string,
  entry: RepositoryDesign,
) {
  if (createHash("sha256").update(markdown).digest("hex") !== entry.sha256)
    throw Error("Repository source checksum differs from the pinned revision.");
  const text = curriculumText(markdown);
  const header = compact(text.slice(0, 7000));
  const title = compact(
    text
      .slice(0, 7000)
      .split(
        /first published|revised|all rights|haki zote|toleo la kwanza/i,
      )[0],
  ).slice(0, 2000);
  const norm = (s: string) =>
    compact(
      s
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^\p{L}\p{N}]+/gu, " "),
    );
  const aliases: Record<string, string[]> = {
    "Indigenous Languages": ["Indigenous Languages", "Indigenous Language"],
    "Science and Technology": ["Science and Technology", "Science Technology"],
  };
  if (
    !(aliases[entry.subject] ?? [entry.subject]).some((s) =>
      norm(title).includes(norm(s)),
    )
  )
    throw Error("The document title does not confirm the mapped subject.");

  const number = Number(entry.grade.match(/\d+/)?.[0]);
  const words: Record<number, string[]> = {
    6: ["six", "sita"],
    7: ["seven", "saba"],
    8: ["eight", "nane"],
    9: ["nine", "tisa"],
    10: ["ten", "kumi"],
    11: ["eleven"],
    12: ["twelve"],
  };
  const gradePattern = new RegExp(
    `(?:grade|gredi)(?:\\s+ya)?\\s*(?:${number}(?!\\d)|${words[number]?.join("|")})(?![a-z])`,
    "i",
  );
  if (!gradePattern.test(title))
    throw Error(`The document header does not confirm ${entry.grade}.`);
  if (
    !/kenya institute of curriculum development|taasisi ya ukuzaji mitaala/i.test(
      header,
    )
  )
    throw Error("The source does not identify KICD in its header.");
  const lines = markdown.split(/\r?\n/);
  const summaryIds = new Set<string>();
  let summaryColumn = -1;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const c = cells(line);
    if (c.some(outcomeHeader)) break;
    const col = c.findIndex((s) =>
      /^sub\s*-?\s*(?:strands?|stands?)\b|^mada ndogo\b/i.test(s),
    );
    if (col >= 0) {
      summaryColumn = col;
      continue;
    }
    if (summaryColumn >= 0 && c[summaryColumn])
      for (const m of c[summaryColumn].matchAll(/\b\d+\.\d+(?:\.\d+)?\b/g))
        if (!m[0].endsWith(".0")) summaryIds.add(m[0]);
  }
  const extractedIds = new Set<string>();
  let truncatedRows = 0;
  let active: {
    strand: number;
    sub: number;
    outcome: number;
    width: number;
  } | null = null;
  let lastStrand = "",
    lastSub = "",
    rows = 0;
  const units: DocumentMapping["subjects"][number]["units"] = [];
  const issues: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    const c = cells(line);
    if (c.every((s) => /^[:\-\s]*$/.test(s))) continue;
    const oi = c.findIndex(outcomeHeader);
    if (oi >= 0) {
      const si = c.findIndex((s) =>
        /^-?\s*strand\b|^mada\b(?!\s+ndogo)/i.test(s),
      );
      const ui = c.findIndex((s) =>
        /^sub\s*-?\s*(?:strands?|stands?)\b|^mada ndogo\b/i.test(s),
      );
      if (si < 0 || ui < 0) {
        issues.push(
          `Line ${i + 1}: learning-outcome header has missing strand columns.`,
        );
        active = null;
        continue;
      }
      active = { strand: si, sub: ui, outcome: oi, width: c.length };
      // Some Swahili headers also carry the current strand name.
      if (numeric(c[si].replace(/^(?:Strand|Mada)\s*/i, "")))
        lastStrand = c[si].replace(/^(?:Strand|Mada)\s*/i, "");
      continue;
    }
    if (!active) continue;
    if (c.filter((s) => /expectations|matarajio/i.test(s)).length > 1) {
      active = null;
      continue;
    }

    if (c.length !== active.width) {
      if (
        c[active.outcome] &&
        /by the end|mwanafunzi|\b[a-z]\)/i.test(c[active.outcome])
      ) {
        truncatedRows++;
        issues.push(
          `Line ${i + 1}: a learning-outcome row is truncated in the source.`,
        );
      }
      active = null;
      continue;
    }
    const strand = c[active.strand],
      sub = c[active.sub],
      out = c[active.outcome];
    if (!out) continue;
    if (
      !numeric(strand) &&
      !numeric(sub) &&
      !(
        /by the end|learner should|mwanafunzi|kufikia mwisho|ifikapo mwisho|\ba\)/i.test(
          out,
        ) &&
        lastStrand &&
        lastSub
      )
    )
      continue;
    rows++;
    const subId = (sub || lastSub).match(/^\d+(?:\.\d+)+/)?.[0];
    if (subId) extractedIds.add(subId);
    lastStrand = strand || lastStrand;
    lastSub = sub || lastSub;
    if (!lastStrand || !lastSub) {
      issues.push(`Line ${i + 1}: missing strand or sub-strand.`);
      continue;
    }
    const strandName =
      lastStrand.replace(/^\d+(?:\.\d+)*[.)]?\s*/, "").trim() || lastStrand;
    const subName = lastSub
      .replace(/\(\s*\d+\s*(?:lessons?|vipindi).*?\)/gi, "")
      .trim();
    const outcomes = splitOutcomes(out);
    let usable = 0;
    for (const outcome of outcomes) {
      if (outcome.length < 8 || outcome.length > 1200) {
        issues.push(`Line ${i + 1}: outcome length needs review.`);
        continue;
      }
      const quote = outcome.length >= 15 ? outcome : out;
      if (quote.length > 2000) {
        issues.push(`Line ${i + 1}: supporting quote is too long.`);
        continue;
      }
      units.push({
        strand: strandName.slice(0, 160),
        subStrand: subName.slice(0, 160),
        outcome,
        quote,
      });
      usable++;
    }
    if (!usable)
      issues.push(`Line ${i + 1}: no usable learning outcomes extracted.`);
  }
  if (!rows || !units.length)
    throw Error("No detailed learning-outcome rows were extracted.");
  if (units.length > 500)
    throw Error(
      "This source exceeds the per-document 500-outcome limit; no partial import is allowed.",
    );
  const missingIds = [...summaryIds].filter((id) => !extractedIds.has(id));
  if (missingIds.length)
    issues.push(
      `${missingIds.length} sub-strand IDs listed in the source summary have no exact extracted ID match (omission or numbering discrepancy): ${missingIds.slice(0, 12).join(", ")}.`,
    );
  const evidence = header.slice(0, 1800);
  const mapping: DocumentMapping = {
    role: "CURRICULUM",
    note: `Third-party transcription of a KICD design. Revision: ${entry.revision}. Source: ${entry.sourceUrl}. Compare against ${entry.officialDirectory}. This is not independent verification that it is the current official edition. Parsed ${rows} detailed rows and ${units.length} outcomes.`,
    subjects: [
      {
        grade: entry.grade,
        subject: entry.subject,
        pathway: "",
        evidence,
        units,
      },
    ],
  };
  mapping.note += issues.length
    ? " SOURCE LIMITATIONS: " + issues.join(" ").slice(0, 600)
    : " Source edition/completeness still requires review.";
  return {
    text,
    mapping: validateMapping(mapping, text, [entry.grade]),
    rows,
    outcomes: units.length,
    coverage: {
      summarySubstrands: summaryIds.size,
      extractedSubstrands: extractedIds.size,
      missingIds,
      truncatedRows,
      warnings: issues,
    },
  };
}
