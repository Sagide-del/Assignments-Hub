import { BadRequestException } from "@nestjs/common";
import { fetchCollection } from "./collection-fetch";
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
export const HOSTED_CURRICULUM_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
];
/** Only public file/folder endpoints. This does not grant access to private files. */
export function hostedCurriculumUrl(raw: string, base?: string): string {
  const u = new URL(raw, base);
  if (u.protocol !== "https:" || u.port || u.username || u.password)
    throw Error("Invalid hosted curriculum URL.");
  if (
    ["drive.google.com", "docs.google.com"].includes(u.hostname) &&
    ["/gview", "/viewer", "/viewerng/viewer"].includes(u.pathname)
  ) {
    const file = u.searchParams.get("url");
    if (file) return officialUrl(file);
  }
  const resourceKey = u.searchParams.get("resourcekey");
  const sharedKey =
    resourceKey && /^[A-Za-z0-9_-]{1,200}$/.test(resourceKey)
      ? "&resourcekey=" + encodeURIComponent(resourceKey)
      : "";
  const id = "[A-Za-z0-9_-]{10,}";
  let match: RegExpMatchArray | null;
  if (u.hostname === "drive.google.com") {
    if ((match = u.pathname.match(new RegExp(`^/file/d/(${id})(?:/|$)`))))
      return `https://drive.google.com/uc?export=download&id=${match[1]}${sharedKey}`;
    if (
      (match = u.pathname.match(
        new RegExp(`^/drive/(?:u/\\d+/)?folders/(${id})(?:/|$)`),
      ))
    )
      return `https://drive.google.com/embeddedfolderview?id=${match[1]}${sharedKey}`;
    const file = u.searchParams.get("id");
    if (file && new RegExp(`^${id}$`).test(file)) {
      if (u.pathname === "/embeddedfolderview")
        return `https://drive.google.com/embeddedfolderview?id=${file}${sharedKey}`;
      if (["/open", "/uc"].includes(u.pathname))
        return `https://drive.google.com/uc?export=download&id=${file}${sharedKey}`;
    }
  }
  if (
    u.hostname === "docs.google.com" &&
    (match = u.pathname.match(
      new RegExp(`^/(document|presentation|spreadsheets)/d/(${id})(?:/|$)`),
    ))
  ) {
    return match[1] === "presentation"
      ? `https://docs.google.com/presentation/d/${match[2]}/export/pdf`
      : `https://docs.google.com/${match[1]}/d/${match[2]}/export?format=pdf`;
  }
  throw Error("Only supported public document/folder endpoints can be used.");
}
export function curriculumResourceUrl(raw: string, base?: string) {
  try {
    return officialUrl(raw, base);
  } catch {
    return hostedCurriculumUrl(raw, base);
  }
}
export function isHostedFolder(url: string) {
  const u = new URL(url);
  return (
    u.hostname === "drive.google.com" &&
    (/^\/drive\/(?:u\/\d+\/)?folders\//.test(u.pathname) ||
      u.pathname === "/embeddedfolderview")
  );
}
export function knownGradeDirectory(grade: string) {
  const names = [
    "six-designs",
    "seven-designs",
    "eight-designs",
    "nine-designs",
    "ten",
    "eleven",
    "twelve",
  ];
  const index = CONTENT_GRADES.indexOf(grade);
  if (index < 0) throw Error("Unsupported grade.");
  return `https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-${names[index]}/`;
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
  // Never execute script/onclick content. Public Drive HTML can contain escaped
  // literal file URLs; decode the literals, not JavaScript expressions.
  const safe = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const add = (raw: string, title: string, offset: number) => {
    try {
      const target = new URL(decode(raw), base);
      if (
        target.protocol === "http:" &&
        [
          "kicd.ac.ke",
          "www.kicd.ac.ke",
          "drive.google.com",
          "docs.google.com",
        ].includes(target.hostname)
      )
        target.protocol = "https:";
      let url = curriculumResourceUrl(target.href, base);
      const parsed = new URL(url);
      const wrapped =
        parsed.searchParams.get("file") ?? parsed.searchParams.get("pdf");
      if (wrapped) url = curriculumResourceUrl(wrapped, url);
      if (seen.has(url)) return;
      const context = safe.slice(Math.max(0, offset - 5000), offset);
      const headings = [
        ...context.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi),
      ];
      const heading = decode(headings.at(-1)?.[1] ?? "");
      const name =
        decode(title) ||
        decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
      const label = suggestedSubject(name, url)
        ? name
        : heading && suggestedSubject(heading, url)
          ? `${heading} ${name}`
          : name;
      const matches = detectedGrades(url + " " + label);
      const grade = matches.length === 1 ? matches[0] : null;
      const hosted =
        new URL(url).hostname !== "kicd.ac.ke" &&
        new URL(url).hostname !== "www.kicd.ac.ke";
      const pdf =
        /\.pdf(?:\?|$)/i.test(url) ||
        (hosted && !isHostedFolder(url)) ||
        /[?&](?:download|wpdmdl|attachment_id)=/i.test(url) ||
        /\/download\//i.test(url);
      const subjectPage = !!suggestedSubject(label, url);
      const path = new URL(url).pathname;
      const withinBase =
        new URL(base).hostname === new URL(url).hostname &&
        url.startsWith(base.replace(/\/$/, "") + "/");
      if (
        pdf ||
        isHostedFolder(url) ||
        (/curriculum.designs/i.test(path) && grade) ||
        (subjectPage &&
          (/cbc-materials|curriculum|design|grade/i.test(path) || withinBase))
      ) {
        seen.add(url);
        links.push({
          url,
          title: label,
          grade,
          pdf,
          ambiguous: matches.length > 1,
        });
      }
    } catch {
      /* Unrelated hosts, login URLs and invalid endpoints are excluded. */
    }
  };
  for (const m of safe.matchAll(
    /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi,
  )) {
    const attrs = m[1] + m[3];
    const hint = attrs.match(
      /(?:title|aria-label)\s*=\s*["']([^"']+)["']/i,
    )?.[1];
    add(m[2], decode(m[4]) || hint || "", m.index ?? 0);
  }
  for (const m of safe.matchAll(/<(?:iframe|embed|object)\b[^>]*>/gi)) {
    const attrs = m[0];
    const target = attrs.match(
      /(?:src|data-src|data)\s*=\s*["']([^"']+)["']/i,
    )?.[1];
    const title = attrs.match(/title\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    if (target) add(target, title, m.index ?? 0);
  }
  // Literal URLs inside public folder metadata are data; no scripts are run.
  if (isHostedFolder(base)) {
    const decoded = html
      .replace(/\\u003d/g, "=")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/");
    for (const m of html.matchAll(
      /<[^>]*\bdata-id\s*=\s*["']([A-Za-z0-9_-]{10,})["'][^>]*>/gi,
    )) {
      const offset = m.index ?? 0;
      const fragment = html
        .slice(offset, offset + 2500)
        .split(/\bdata-id\s*=/i)
        .slice(0, 2)
        .join("data-id=");
      const label = fragment.match(
        /(?:data-tooltip|aria-label)\s*=\s*["']([^"']*\.pdf)["']/i,
      )?.[1];
      if (label) add(`https://drive.google.com/file/d/${m[1]}/view`, label, 0);
    }
    for (const m of decoded.matchAll(
      /https:\/\/(?:drive|docs)\.google\.com\/(?:file|document|presentation|spreadsheets)\/d\/[A-Za-z0-9_-]{10,}[^"'<>\s\\]*/g,
    ))
      add(m[0], "", 0);
  }
  return links.slice(0, 240);
}
export async function fetchOfficial(
  raw: string,
): Promise<{ bytes: Buffer; url: string; type: string }> {
  let url = curriculumResourceUrl(raw);
  if (HOSTED_CURRICULUM_HOSTS.includes(new URL(url).hostname))
    return fetchCollection(url, HOSTED_CURRICULUM_HOSTS);
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
      url = curriculumResourceUrl(next, url);
      if (HOSTED_CURRICULUM_HOSTS.includes(new URL(url).hostname))
        return fetchCollection(url, HOSTED_CURRICULUM_HOSTS);
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
