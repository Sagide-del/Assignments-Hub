import { BadRequestException } from "@nestjs/common";
import { ImportCombinationsDto, KjseaResultEntryDto } from "./matcher.dto";
export const normalized = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function officialSource(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      ["education.go.ke", "kemis.go.ke", "kicd.ac.ke"].some(
        (host) => u.hostname === host || u.hostname.endsWith("." + host),
      )
    );
  } catch {
    return false;
  }
}
export function checkedCatalog(dto: ImportCombinationsDto) {
  if (!officialSource(dto.source_url))
    throw new BadRequestException(
      "Use an official Ministry/KEMIS/KICD source URL.",
    );
  const codes = new Set<string>();
  return dto.combinations.map((row) => {
    const code = row.code.trim().toUpperCase(),
      subjects = row.subjects.map((s) => s.trim());
    if (
      !/^[A-Z]{2,4}\d{3,6}$/.test(code) ||
      [row.pathway, row.track, ...subjects].some(
        (s) => s.trim().length < 2 || /[<>\u0000-\u001f]/.test(s),
      )
    )
      throw new BadRequestException("Invalid catalogue text.");
    if (codes.has(code) || new Set(subjects.map(normalized)).size !== 3)
      throw new BadRequestException("Duplicate combination code or subject.");
    codes.add(code);
    return {
      code,
      pathway: row.pathway.trim(),
      track: row.track.trim(),
      subjects,
      source_url: dto.source_url,
      is_verified: true,
      verified_at: new Date(),
    };
  });
}
// Preparation indicators, not MoE admission rules. Different senior subjects
// can share a junior foundation; each junior score is used at most once.
export function preparation(
  subjects: string[],
  scores: KjseaResultEntryDto[],
  target: number,
) {
  const areas = new Set<string>();
  for (const subject of subjects) {
    const n = normalized(subject);
    if (/math/.test(n)) areas.add("mathematics");
    else if (/biology|chemistry|physics|science/.test(n))
      areas.add("integratedscience");
    else if (
      /aviation|computer|electrical|building|technical|construction|engineering/.test(
        n,
      )
    )
      areas.add("pretechnicalstudies");
    else if (/agricultur|nutrition|homescience/.test(n))
      areas.add("agricultureandnutrition");
    else areas.add(n);
  }
  const used = [...areas].map((area) => {
    const aliases: Record<string, string[]> = {
      mathematics: ["mathematics", "maths", "coremathematics"],
      integratedscience: ["integratedscience"],
      pretechnicalstudies: ["pretechnicalstudies", "pretechnical"],
      agricultureandnutrition: [
        "agricultureandnutrition",
        "agriculturenutrition",
      ],
    };
    const row = scores.find((s) =>
      (aliases[area] ?? [area]).includes(normalized(s.subject)),
    );
    return {
      area,
      subject: row?.subject ?? area,
      percentage: row?.percentage ?? null,
      performance_level: row?.performance_level ?? null,
      gap:
        typeof row?.percentage === "number"
          ? Math.max(0, target - row.percentage)
          : null,
    };
  });
  const known = used.filter((s) => s.percentage !== null);
  return {
    average: known.length
      ? Math.round(known.reduce((n, s) => n + s.percentage!, 0) / known.length)
      : null,
    indicators: used,
  };
}
