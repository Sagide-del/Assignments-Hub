import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { readFile } from "fs/promises";
import { join } from "path";
import { focusLabels, skillProgram } from "./focused-learning.service";
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function skillWorkbookHtml(title: string, brand: string) {
  const p = skillProgram(title);
  if (!p)
    throw new NotFoundException(
      "A curated workbook is not available for this course yet.",
    );
  const list = (items: string[]) =>
    `<ol>${items.map((x) => `<li>${escape(x)}</li>`).join("")}</ol>`;
  const header = `<header><svg viewBox="64 380 1330 330" width="170" height="43"><image href="${brand}" width="1448" height="1086" /></svg><span>SKILL WORKBOOK · ${escape(p.version)}</span></header>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px/1.6 Arial;color:#183b30;margin:0}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #b7d84c;padding-bottom:10px}header span{font-size:9px;color:#667469}h1{font-size:32px;line-height:1.15;max-width:520px;margin:45px 0 15px}h2{font-size:23px;line-height:1.25;margin:22px 0 10px}h3{font-size:12px;margin:18px 0 6px}p{margin:8px 0}li{margin:7px 0}ol,ul{padding-left:20px}.tag{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#637d32}.example{background:#edf4e7;padding:14px 16px;border-left:3px solid #9bbf42}.transfer{background:#efedf8;padding:14px 16px}.page{break-before:page}.lines{height:85px;background:repeating-linear-gradient(white,white 23px,#dce2df 24px)}.small{font-size:10px;color:#65736b}footer{margin-top:24px;border-top:1px solid #dce2df;padding-top:9px;font-size:9px;color:#65736b}.rubric td,.rubric th{border-bottom:1px solid #dce2df;padding:9px;text-align:left;vertical-align:top}.rubric{width:100%;border-collapse:collapse}section{break-inside:avoid}</style></head><body>${header}<p class="tag" style="margin-top:35px">${escape(focusLabels[p.focus])} · Grades ${p.minGrade}–${p.maxGrade}</p><h1>${escape(p.title)}</h1><div class="example"><strong>Your learning cycle</strong><p>Recall → study an example → make something → test a variation → reflect → revisit after one day, three days and one week.</p></div><h3>Your project brief</h3><p>${escape(p.project)}</p><h3>What you will learn</h3>${list(p.lessons.map((l) => l.objective))}<h3>Your plan</h3><p>Choose two or three 25-minute sessions each week. Keep no more than two skills active. Save your work before switching devices.</p><p>Name: _______________________ &nbsp; Start date: ___________________</p><footer>Assignment Hub · assignmenthub.co.ke · Original learning material. Introductory practice, not professional certification.</footer>
 ${p.lessons.map((l, i) => `<article class="page">${header}<p class="tag">Session ${i + 1} / ${p.lessons.length}</p><h2>${escape(l.title)}</h2><p>${escape(l.objective)}</p><h3>Recall first</h3><p>Without opening your previous work, write one idea or decision you remember.</p><div class="lines" style="height:48px"></div><section class="example"><strong>Worked example</strong><p>${escape(l.example)}</p></section><h3>Make and test</h3>${list(l.practice)}<section class="transfer"><strong>Try it in a different situation</strong><p>${escape(l.transfer)}</p></section><h3>Evidence: what did you make or test?</h3><div class="lines"></div><h3>Explain one change, its result and what you would try next</h3><div class="lines"></div><p class="small">Revisit: tomorrow □ &nbsp; after 3 days □ &nbsp; after 1 week □</p><footer>Assignment Hub · ${escape(p.title)} · Session ${i + 1} · ${escape(p.version)}</footer></article>`).join("")}
 <article class="page">${header}<h2>Project review</h2><p>${escape(p.project)}</p><table class="rubric"><tr><th>Look for</th><th>Your evidence</th></tr>${["Purpose: the work meets the brief", "Accuracy: key ideas are applied correctly", "Transfer: a different version solves a new problem", "Iteration: feedback led to one clear improvement", "Reflection: you can explain your decisions"].map((x) => `<tr><td>${x}</td><td>___________________________<br/>___________________________</td></tr>`).join("")}</table><h3>Get useful feedback</h3><p>Ask a peer or teacher: what is clear, what could improve, and which one change would make the most difference? A saved completion record is not a teacher assessment.</p><h3>Return to it</h3><p>On a new day, attempt the transfer task without the worked example. Compare the new work with your first attempt and note one remaining difficulty.</p><h3>References & responsible practice</h3><p>Assignment Hub original course materials. Music theory reference: <a href="https://viva.pressbooks.pub/openmusictheory/">Open Music Theory</a>. Curriculum reference: <a href="https://kicd.ac.ke/">KICD</a>.</p><p>Use original or permission-cleared material. Keep listening levels comfortable. Never share private information in project notes. For physical activities, follow school supervision and safety guidance.</p><footer>Assignment Hub · assignmenthub.co.ke · Learn by making. Improve by reflecting.</footer></article></body></html>`;
}
@Injectable()
export class SkillWorkbookService {
  private busy = false;
  constructor(private readonly config: ConfigService) {}
  async render(title: string) {
    if (this.busy)
      throw new ServiceUnavailableException(
        "A workbook is rendering. Please try again shortly.",
      );
    this.busy = true;
    let browser;
    try {
      const logo = await readFile(
        join(__dirname, "..", "study-hub", "assets", "assignment-hub.png"),
      );
      const html = skillWorkbookHtml(
        title,
        "data:image/png;base64," + logo.toString("base64"),
      );
      browser = await puppeteer.launch({
        executablePath:
          this.config.get<string>("SKILLS_CHROMIUM_EXECUTABLE") ||
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
