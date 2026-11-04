import { Injectable, ServiceUnavailableException } from "@nestjs/common";
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
  const list = (values: string[]) =>
    `<ul>${values.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${formulaCss}\n@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px Arial;color:#101820;line-height:1.65;margin:0}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #BBD125;padding-bottom:12px}.brand-wrap{position:relative;width:165px;height:42px;overflow:hidden}.brand{position:absolute;width:165px;max-width:none;left:0;top:50%;transform:translateY(-50%)}small{color:#64748b}h1{font-size:24px;line-height:1.3;margin:22px 0 6px}h2{font-size:14px;margin:0 0 10px}.map{padding:10px;background:#f8fafc;border-radius:10px;margin:18px 0;break-inside:avoid}svg{display:block;width:100%;max-height:260px}section{margin:18px 0;break-inside:avoid}li{margin:6px 0}ul{padding-left:20px;margin:0}.formulas{background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;padding:16px}.mistakes{background:#fff7f7;border:1px solid #fecaca;border-radius:10px;padding:16px}.formula{margin:8px 0;overflow-wrap:anywhere}footer{margin-top:25px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#64748b}</style></head><body><header><div class="brand-wrap"><img class="brand" alt="Assignment Hub" src="${brand}"/></div><small>Grade ${module.grade} · Batch ${module.batch_number}</small></header><h1>${esc(module.topic)}</h1><small>${esc(module.subject)} · Cheat sheet</small><div class="map">${diagram}</div><section><h2>Key concepts</h2>${list(sheet.key_concepts)}</section>${sheet.key_formulas.length ? `<section class="formulas"><h2>Key formulas</h2>${sheet.key_formulas.map((f) => `<div class="formula">${katex.renderToString(f, { throwOnError: false, trust: false, strict: "error", output: "htmlAndMathml", maxExpand: 100, maxSize: 20 })}</div>`).join("")}</section>` : ""}<section class="mistakes"><h2>Common mistakes</h2>${list(sheet.common_mistakes)}</section><footer>Assignment Hub · <a href="https://assignmenthub.co.ke">assignmenthub.co.ke</a></footer></body></html>`;
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
      const html = librarySheetHtml(
        module,
        module.theory_cheatsheet,
        "data:image/png;base64," + logo.toString("base64"),
        css,
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
      return Buffer.from(
        await page.pdf({ format: "A4", printBackground: true, timeout: 30000 }),
      );
    } finally {
      if (browser) await browser.close().catch(() => {});
      this.busy = false;
    }
  }
}
