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
export function curriculumLinks(html: string, base: string) {
  const links: {
    url: string;
    title: string;
    grade: string | null;
    pdf: boolean;
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
      const numbers = ["seven", "eight", "nine", "ten", "eleven", "twelve"];
      let grade: string | null = null;
      for (let i = 0; i < 6; i++)
        if (
          new RegExp(`grade\\s*(?:${i + 7}(?!\\d)|${numbers[i]})`).test(words)
        )
          grade = `Grade ${i + 7}`;
      const pdf = /\.pdf(?:\?|$)/i.test(url);
      if (pdf || (/curriculum.designs/.test(url) && grade))
        links.push({ url, title, grade, pdf });
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
