import { cheatsheetDiagramSvg } from "../cms/cheatsheet-diagram";
import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import * as katex from "katex";
import {
  parseConceptMap,
  TheoryCheatsheet,
  validateTheoryCheatsheet,
} from "../cms/theory-cheatsheet";
import { resolveCheatsheetVisual } from "../cms/cheatsheet-visuals";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function librarySheetHtml(
  module: {
    topic: string;
    subject: string;
    grade: number;
    batch_number: number;
  },
  value: unknown,
  brand: string,
  formulaCss: string,
  illustration?: string,
) {
  const sheet: TheoryCheatsheet = validateTheoryCheatsheet(value);
  const map = parseConceptMap(sheet.concept_diagram.latex_code);
  const point = (id: string) => {
    const n = map.nodes.find((n) => n.id === id)!;
    return { x: 100 + n.x * 70, y: 60 + (6 - n.y) * 60 };
  };
  const nodes = map.nodes.map((n) => ({ ...n, ...point(n.id) }));
  const minX = Math.min(...nodes.map((n) => n.x)) - 100,
    minY = Math.min(...nodes.map((n) => n.y)) - 45;
  const w = Math.max(...nodes.map((n) => n.x)) - minX + 100,
    h = Math.max(...nodes.map((n) => n.y)) - minY + 45;
  const diagram = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" role="img" aria-label="Concept diagram"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#64748b"/></marker></defs>${map.edges
    .map((e) => {
      const a = point(e.from),
        b = point(e.to),
        dx = b.x - a.x,
        dy = b.y - a.y,
        l = Math.hypot(dx, dy),
        short = 95;
      return `<line x1="${a.x + (dx / l) * short}" y1="${a.y + (dy / l) * short}" x2="${b.x - (dx / l) * short}" y2="${b.y - (dy / l) * short}" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>`;
    })
    .join(
      "",
    )}${nodes.map((n) => `<g><rect x="${n.x - 85}" y="${n.y - 33}" width="170" height="66" rx="10" fill="white" stroke="#9cba37"/><foreignObject x="${n.x - 79}" y="${n.y - 29}" width="158" height="58"><div xmlns="http://www.w3.org/1999/xhtml" style="height:58px;display:flex;align-items:center;justify-content:center;text-align:center;font:12px Arial;overflow-wrap:anywhere">${esc(n.label)}</div></foreignObject></g>`).join("")}</svg>`;
  const visual = resolveCheatsheetVisual(module.topic);
  const hero =
    visual && illustration
      ? `<figure class="visual"><img src="${esc(illustration)}" alt="${esc(visual.alt)}"/><div class="visual-labels">${visual.labels.map((label) => `<b>${esc(label)}</b>`).join("")}</div><figcaption>${esc(visual.caption)}</figcaption></figure>`
      : sheet.visual_diagram
        ? `<figure class="map generated-diagram"><h2>${esc(sheet.visual_diagram.title)}</h2>${cheatsheetDiagramSvg(sheet.visual_diagram)}<figcaption>${esc(sheet.visual_diagram.caption)}</figcaption></figure>`
        : `<figure class="map">${diagram}<figcaption>Concept relationships · follow the arrows to connect the ideas.</figcaption></figure>`;
  const list = (values: string[]) =>
    `<ul>${values.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(module.topic)} · Assignment Hub</title><style>${formulaCss}
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#111;line-height:1.45;margin:0}article{width:186mm}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px}.brand-wrap{width:145px;height:32px;overflow:hidden}.brand{width:145px;height:32px;object-fit:cover;object-position:center;filter:grayscale(1)}small{font-size:9px;color:#444}h1{font-size:27px;line-height:1.12;margin:12px 0 4px;overflow-wrap:anywhere}h2{font-size:12px;margin:0 0 7px;text-transform:uppercase;letter-spacing:.7px}.eyebrow{font-size:9px;font-weight:bold;letter-spacing:1.3px}.map,.visual{margin:12px 0;break-inside:avoid}.map{border:1px solid #aaa;padding:10px}.map svg{display:block;width:100%;height:155px;filter:grayscale(1)}.generated-diagram svg{height:auto;max-height:none}.visual>img{display:block;width:100%;height:220px;object-fit:contain;filter:grayscale(1) contrast(1.06)}.visual-labels{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;text-align:center;font-size:10px}.visual-labels b{border-top:2px solid #111;padding-top:5px}figcaption{font-size:9px;color:#444;text-align:center;margin-top:6px}section{margin:12px 0;break-inside:avoid}ul{padding-left:17px;margin:0}li{margin:4px 0;overflow-wrap:anywhere}.concepts ul{columns:2;column-gap:24px}.concepts li{break-inside:avoid}.reference{display:grid;grid-template-columns:1fr 1fr;gap:12px}.reference.single{grid-template-columns:1fr}.formulas,.mistakes{border:1px solid #777;padding:10px}.formula{margin:6px 0;overflow-wrap:anywhere}.katex{font-size:1.05em}.recall{border-top:2px solid #111;padding-top:7px;font-size:10px}footer{margin-top:12px;border-top:1px solid #111;padding-top:7px;display:flex;justify-content:space-between;font-size:9px}a{color:inherit;text-decoration:none}</style></head><body><article data-cheatsheet-document><header><div class="brand-wrap"><img class="brand" alt="Assignment Hub" src="${esc(brand)}"/></div><small>Grade ${esc(module.grade)} · ${esc(module.subject)} · Batch ${esc(module.batch_number)}</small></header><h1>${esc(module.topic)}</h1><div class="eyebrow">VISUAL REVISION GUIDE · UNDERSTAND / PRACTISE / RECALL</div>${hero}<section class="concepts"><h2>01 / Understand the essentials</h2>${list(sheet.key_concepts)}</section><div class="reference ${sheet.key_formulas.length ? "" : "single"}">${sheet.key_formulas.length ? `<section class="formulas"><h2>02 / Key formulas</h2>${sheet.key_formulas.map((f) => `<div class="formula">${katex.renderToString(f, { throwOnError: false, trust: false, strict: "error", output: "htmlAndMathml", maxExpand: 100, maxSize: 20 })}</div>`).join("")}</section>` : ""}<section class="mistakes"><h2>${sheet.key_formulas.length ? "03" : "02"} / Common mistakes</h2>${list(sheet.common_mistakes)}</section></div><div class="recall"><b>Check your understanding</b> · Cover the notes. Explain one key idea, give an example, then correct one common mistake.</div><footer><span>Assignment Hub · Learn with understanding.</span><a href="https://assignmenthub.co.ke">assignmenthub.co.ke</a></footer></article></body></html>`;
}
@Injectable()
export class LibraryPdfService {
  private busy = false;
  constructor(private readonly config: ConfigService) {}
  async render(module: any) {
    if (this.busy)
      throw new ServiceUnavailableException(
        "A cheat sheet is rendering. Please retry shortly.",
      );
    this.busy = true;
    let browser;
    try {
      const root = dirname(require.resolve("katex/dist/katex.min.css"));
      let css = await readFile(join(root, "katex.min.css"), "utf8");
      const paths = [
        ...new Set(
          [...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map((m) => m[1]),
        ),
      ];
      for (const path of paths) {
        const bytes = await readFile(join(root, path));
        const mime = path.endsWith("woff2")
          ? "font/woff2"
          : path.endsWith("woff")
            ? "font/woff"
            : "font/ttf";
        css = css
          .split(path)
          .join(`data:${mime};base64,${bytes.toString("base64")}`);
      }
      const logo = await readFile(
        join(__dirname, "..", "study-hub", "assets", "assignment-hub.png"),
      );
      const visual = resolveCheatsheetVisual(module.topic);
      let illustration: string | undefined;
      if (visual) {
        const bytes = await readFile(
          join(
            __dirname,
            "..",
            "study-hub",
            "assets",
            "cheatsheet-illustrations",
            visual.key + ".webp",
          ),
        );
        illustration = "data:image/webp;base64," + bytes.toString("base64");
      }
      const html = librarySheetHtml(
        module,
        module.theory_cheatsheet,
        "data:image/png;base64," + logo.toString("base64"),
        css,
        illustration,
      );
      browser = await puppeteer.launch({
        executablePath:
          this.config.get<string>("LIBRARY_CHROMIUM_EXECUTABLE") ||
          (await chromium.executablePath()),
        args: chromium.args,
        headless: true,
        timeout: 30000,
      });
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on("request", (r) =>
        r.url().startsWith("data:") ? r.continue() : r.abort(),
      );
      await page.setContent(html, { waitUntil: "load", timeout: 30000 });
      // Preserve every teaching point. Never clip content or silently add a page.
      const fits = await page.evaluate(() => {
        const document = window.document;
        const article = document.querySelector<HTMLElement>("article")!;
        const maxHeight = ((297 - 24) * 96) / 25.4;
        for (const size of [13, 12.5, 12]) {
          document.body.style.fontSize = `${size}px`;
          if (
            article.getBoundingClientRect().height <= maxHeight - 4 &&
            article.scrollWidth <= article.clientWidth + 1
          )
            return true;
        }
        return false;
      });
      if (!fits)
        throw new UnprocessableEntityException(
          "This cheat sheet needs shorter teaching points before it can be printed legibly on one page. Ask the content editor to condense it; no content has been removed.",
        );
      return Buffer.from(
        await page.pdf({ format: "A4", printBackground: true, timeout: 30000 }),
      );
    } finally {
      if (browser) await browser.close().catch(() => {});
      this.busy = false;
    }
  }
}
