import { inflateRawSync } from "zlib";
import { CONTENT_GRADES } from "./official-curriculum";
export interface DocumentMapping {
  role: "CURRICULUM" | "TEACHING" | "FRAMEWORK";
  subjects: {
    grade: string;
    subject: string;
    pathway: string;
    evidence: string;
    units: {
      strand: string;
      subStrand: string;
      outcome: string;
      quote: string;
    }[];
  }[];
  note: string;
}
export function plainText(html: string) {
  return html
    .replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, v) =>
      String.fromCodePoint(Math.min(Number(v), 0x10ffff)),
    )
    .replace(/\s+/g, " ")
    .trim();
}
export const compact = (s: string) => s.replace(/\s+/g, " ").trim();
export function validateMapping(
  value: any,
  text: string,
  grades: string[],
): DocumentMapping {
  const str = (v: any, min: number, max: number) =>
    typeof v === "string" && v.trim().length >= min && v.length <= max;
  if (
    !value ||
    !["CURRICULUM", "TEACHING", "FRAMEWORK"].includes(value.role) ||
    !Array.isArray(value.subjects) ||
    !value.subjects.length ||
    value.subjects.length > 200
  )
    throw Error(
      "No grade/subject mapping could be confirmed. Review this document.",
    );
  const subjects: DocumentMapping["subjects"] = value.subjects.map((s: any) => {
    if (
      !grades.includes(s.grade) ||
      !CONTENT_GRADES.includes(s.grade) ||
      !str(s.subject, 2, 120) ||
      !Array.isArray(s.units) ||
      s.units.length > 500
    )
      throw Error("Invalid or out-of-scope curriculum mapping.");
    if (
      !str(s.evidence, 15, 2000) ||
      !compact(text).toLowerCase().includes(compact(s.evidence).toLowerCase())
    )
      throw Error("Keep an exact source excerpt for each subject mapping.");
    const units = s.units.map((u: any) => {
      if (
        !str(u.strand, 2, 160) ||
        !str(u.subStrand, 2, 160) ||
        !str(u.outcome, 8, 1200) ||
        !str(u.quote, 15, 2000) ||
        !compact(text).toLowerCase().includes(compact(u.quote).toLowerCase())
      )
        throw Error(
          "An outcome must have an exact supporting quotation in this document.",
        );
      return {
        strand: u.strand.trim(),
        subStrand: u.subStrand.trim(),
        outcome: u.outcome.trim(),
        quote: u.quote.trim(),
      };
    });
    if (value.role === "CURRICULUM" && !units.length)
      throw Error("A curriculum design needs quoted learning outcomes.");
    return {
      grade: s.grade,
      subject: s.subject.trim(),
      pathway: str(s.pathway, 1, 120) ? s.pathway.trim() : "",
      evidence: s.evidence.trim(),
      units,
    };
  });
  const keys = subjects.map(
    (s) => `${s.grade}:${s.subject.toLowerCase()}:${s.pathway.toLowerCase()}`,
  );
  if (new Set(keys).size !== keys.length)
    throw Error("Remove duplicate subject mappings.");
  return {
    role: value.role,
    subjects,
    note: typeof value.note === "string" ? value.note.slice(0, 2000) : "",
  };
}
export function catalogueRows(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length > 301)
    throw Error("A catalogue import supports up to 300 subject rows.");
  const parse = (line: string) => {
    const fields: string[] = [];
    let part = "",
      quoted = false;
    const separator = line.includes("\t") ? "\t" : ",";
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          part += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === separator && !quoted) {
        fields.push(part.trim());
        part = "";
      } else part += c;
    }
    if (quoted) throw Error("Unclosed CSV quote.");
    fields.push(part.trim());
    return fields;
  };
  return lines.flatMap((line, i) => {
    const [grade, subject, pathway = ""] = parse(line);
    if (i === 0 && /^grade$/i.test(grade)) return [];
    if (
      !CONTENT_GRADES.includes(grade) ||
      !subject ||
      subject.length > 120 ||
      pathway.length > 120
    )
      throw Error(
        `Review catalogue row ${i + 1}; use Grade 6–12, subject, optional pathway.`,
      );
    return [{ grade, subject, pathway }];
  });
}
// Read bounded ZIP entries in memory; never extract archive paths to disk.
export function unpackCollectionZip(bytes: Buffer) {
  if (bytes.length > 50 * 1024 * 1024)
    throw Error("ZIP must be 50 MB or smaller.");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Error("Invalid ZIP central directory.");
  const count = bytes.readUInt16LE(end + 10),
    offset = bytes.readUInt32LE(end + 16);
  if (
    count > 200 ||
    count === 0xffff ||
    bytes.readUInt16LE(end + 4) !== 0 ||
    bytes.readUInt16LE(end + 6) !== 0
  )
    throw Error("Use a single-volume ZIP with at most 200 entries.");
  let cursor = offset,
    total = 0;
  const result: { name: string; bytes: Buffer }[] = [],
    seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw Error("Invalid ZIP entry.");
    const flags = bytes.readUInt16LE(cursor + 8),
      method = bytes.readUInt16LE(cursor + 10),
      compressed = bytes.readUInt32LE(cursor + 20),
      size = bytes.readUInt32LE(cursor + 24),
      nameSize = bytes.readUInt16LE(cursor + 28),
      extra = bytes.readUInt16LE(cursor + 30),
      comment = bytes.readUInt16LE(cursor + 32),
      local = bytes.readUInt32LE(cursor + 42),
      name = bytes
        .subarray(cursor + 46, cursor + 46 + nameSize)
        .toString("utf8")
        .replace(/\\/g, "/");
    cursor += 46 + nameSize + extra + comment;
    if (
      !name ||
      name.startsWith("/") ||
      name.includes("\0") ||
      name.split("/").some((p) => p === "..") ||
      /^[a-z]:/i.test(name)
    )
      throw Error("Unsafe ZIP filename.");
    if (name.endsWith("/")) continue;
    if (seen.has(name)) throw Error("Duplicate ZIP filename.");
    seen.add(name);
    if (!/\.(pdf|txt|html?)$/i.test(name)) continue;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      size > 15 * 1024 * 1024 ||
      compressed > 50 * 1024 * 1024
    )
      throw Error("Unsupported, encrypted or oversized ZIP entry.");
    total += size;
    if (total > 100 * 1024 * 1024)
      throw Error("Expanded ZIP must be 100 MB or smaller.");
    if (local + 30 > bytes.length || bytes.readUInt32LE(local) !== 0x04034b50)
      throw Error("Invalid ZIP local header.");
    const start =
      local +
      30 +
      bytes.readUInt16LE(local + 26) +
      bytes.readUInt16LE(local + 28);
    if (start + compressed > bytes.length) throw Error("Truncated ZIP entry.");
    const data = bytes.subarray(start, start + compressed),
      body =
        method === 0
          ? Buffer.from(data)
          : inflateRawSync(data, { maxOutputLength: 15 * 1024 * 1024 });
    if (body.length !== size) throw Error("ZIP entry size mismatch.");
    result.push({ name, bytes: body });
  }
  if (!result.length)
    throw Error("ZIP has no supported PDF, TXT or HTML documents.");
  return result;
}

export function linkedGrades(value: string): string[] {
  const words = decodeURIComponent(value).toLowerCase().replace(/[_-]/g, " "),
    names = [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
    ],
    result = new Set<string>();
  names.forEach((name, i) => {
    if (
      new RegExp(`grades?\\s*(?:${i + 1}(?!\\d)|${name}(?![a-z]))`).test(words)
    )
      result.add(`Grade ${i + 1}`);
  });
  for (const m of words.matchAll(/grades?\s*((?:\d{1,2}[\s,/]*)+)/g))
    for (const n of m[1].match(/\d+/g) ?? [])
      if (Number(n) >= 1 && Number(n) <= 12) result.add(`Grade ${Number(n)}`);
  return [...result];
}
