import { BadRequestException } from "@nestjs/common";
const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function officialUrl(
  raw: string,
  base = "https://kicd.ac.ke/cbc-materials/",
) {
  const url = new URL(raw, base);
  if (
    url.protocol !== "https:" ||
    !["kicd.ac.ke", "www.kicd.ac.ke"].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  )
    throw new BadRequestException(
      "Only official KICD HTTPS curriculum links are supported.",
    );
  url.hash = "";
  return url.href;
}
export const CONTENT_GRADES = [6, 7, 8, 9, 10, 11, 12].map((n) => `Grade ${n}`);
export function detectedGrades(text: string): string[] {
  const words = text.toLowerCase().replace(/[_-]/g, " ");
  const names = ["six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  return names.flatMap((name, i) =>
    new RegExp(`grade\\s*(?:${i + 6}(?!\\d)|${name}(?![a-z]))`, "i").test(words)
      ? [`Grade ${i + 6}`]
      : [],
  );
}
export function suggestedSubject(
  title: string,
  url: string,
): string | undefined {
  const words = (
    title +
    " " +
    decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "")
  )
    .toLowerCase()
    .replace(/[_&+-]/g, " ")
    .replace(/\s+/g, " ");
  const subjects: [RegExp, string][] = [
    [/agriculture.*nutrition/, "Agriculture and Nutrition"],
    [/science.*technology/, "Science and Technology"],
    [/integrated science/, "Integrated Science"],
    [/social studies/, "Social Studies"],
    [/creative arts/, "Creative Arts"],
    [/pre technical/, "Pre-Technical Studies"],
    [/christian religious|\bcre\b/, "Christian Religious Education"],
    [/islamic religious|\bire\b/, "Islamic Religious Education"],
    [/hindu religious|\bhre\b/, "Hindu Religious Education"],
    [/history.*citizenship/, "History and Citizenship"],
    [/computer studies/, "Computer Studies"],
    [/business studies/, "Business Studies"],
    [/general science/, "General Science"],
    [/mathematics|\bmaths\b/, "Mathematics"],
    [/english/, "English"],
    [/kiswahili/, "Kiswahili"],
    [/biology/, "Biology"],
    [/chemistry/, "Chemistry"],
    [/physics/, "Physics"],
    [/geography/, "Geography"],
    [/agriculture/, "Agriculture"],
    [/home science/, "Home Science"],
    [/french/, "French"],
    [/german/, "German"],
    [/arabic/, "Arabic"],
    [/mandarin/, "Mandarin"],
    [/music/, "Music"],
    [/sports/, "Sports and Recreation"],
  ];
  return subjects.find(([pattern]) => pattern.test(words))?.[1];
}
export function curriculumLinks(html: string, base: string) {
  const links: {
    url: string;
    title: string;
    grade: string | null;
    pdf: boolean;
    ambiguous?: boolean;
  }[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    try {
      const url = officialUrl(decode(m[1]), base);
      if (seen.has(url)) continue;
      seen.add(url);
      const title =
        decode(m[2]) ||
        decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
      const words = (url + " " + title).toLowerCase().replace(/[_-]/g, " ");
      const matches = detectedGrades(words);
      const grade = matches.length === 1 ? matches[0] : null;
      const pdf = /\.pdf(?:\?|$)/i.test(url);
      if (pdf || (/curriculum.designs/.test(url) && grade))
        links.push({ url, title, grade, pdf, ambiguous: matches.length > 1 });
    } catch {
      /* External/unrelated links are not fetched. */
    }
  }
  return links.slice(0, 180);
}
export async function fetchOfficial(
  raw: string,
): Promise<{ bytes: Buffer; url: string; type: string }> {
  let url = officialUrl(raw);
  for (let i = 0; i < 5; i++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": "AssignmentHub-CurriculumImporter/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      await response.body?.cancel();
      if (!next) throw Error("Official source redirect has no target.");
      url = officialUrl(next, url);
      continue;
    }
    if (!response.ok)
      throw Error(`Official source returned HTTP ${response.status}.`);
    const reader = response.body?.getReader();
    if (!reader) throw Error("Official source has no content.");
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 15 * 1024 * 1024) throw Error("Curriculum exceeds 15 MB.");
        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel();
    }
    return {
      bytes: Buffer.concat(chunks),
      url,
      type: response.headers.get("content-type") ?? "",
    };
  }
  throw Error("Too many curriculum redirects.");
}
