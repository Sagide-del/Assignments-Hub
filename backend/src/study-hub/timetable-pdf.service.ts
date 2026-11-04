import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { readFile } from "fs/promises";
import { join } from "path";
import { CslPhotoService } from "../csl/csl-photo.service";
import { WeeklyPlan, StudyBlock } from "./timetable.types";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function subjectFamily(subject: string) {
  return /math/i.test(subject)
    ? "math"
    : /science|biology|chemistry|physics|agriculture|technology|computer|aviation/i.test(
          subject,
        )
      ? "science"
      : /english|kiswahili|arabic|french|language/i.test(subject)
        ? "language"
        : /community|csl/i.test(subject)
          ? "csl"
          : "other";
}
export function timetableHtml(
  data: any,
  brand: string,
  schoolLogo: string | null,
) {
  const plan = data.plan as WeeklyPlan;
  const card = (b: StudyBlock, recall?: StudyBlock) => {
    if (b.activity_type === "BREAK" || b.activity_type === "REWARD")
      return `<div class="block ${b.activity_type === "REWARD" ? "reward" : "rest"}"><span class="time">${esc(b.start)}–${esc(b.end)}</span><div class="topic">${esc(b.activity_type === "REWARD" ? "Reward: music, a walk or a favourite video" : b.topic)}</div></div>`;
    return `<div class="block ${b.activity_type === "RECALL" ? "recall" : subjectFamily(b.subject)}"><div class="time">${esc(b.start)}–${esc(b.end)}</div><b>${esc(b.subject)}</b>${b.activity_type === "STUDY" || b.activity_type === "RECALL" ? `<div class="topic">${esc(b.topic)}</div><small>${b.focus_zone ? "● FOCUS ZONE · " : ""}${esc(b.technique)}</small>${recall ? `<div class="recall-strip">${esc(recall.start)}–${esc(recall.end)} · Active recall</div>` : ""}` : `<div class="topic">${esc(b.topic)}</div>`}</div>`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font:10px Arial,sans-serif;color:#101820;margin:0}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #BBD125;padding-bottom:9px}.brand{position:relative;width:180px;height:44px;overflow:hidden}.brand img{position:absolute;width:180px;max-width:none;left:0;top:50%;transform:translateY(-50%)}.school{display:flex;align-items:center;gap:9px}.school img{max-width:40px;max-height:40px}.school strong{font-size:15px}h1{margin:0;font-size:20px}.meta{color:#64748b;margin-top:5px}.quote{margin:10px 0;color:#475569;font-style:italic}.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.day{min-width:0}.day-title{padding:7px 4px;background:#101820;color:white;border-radius:5px;margin-bottom:5px;font-weight:bold}.date{display:block;font-size:8px;font-weight:normal;margin-top:3px}.block{padding:4px 5px;margin-bottom:4px;border-left:3px solid #94a3b8;border-radius:3px;break-inside:avoid}.time{font-size:8px;color:#475569;margin-bottom:2px}b{font-size:9px}.topic{font-size:8px;line-height:1.35;overflow-wrap:anywhere}.block small{font-size:7px;color:#475569}.math{background:#eff6ff;border-color:#2563eb}.science{background:#ecfdf5;border-color:#059669}.language{background:#fff7ed;border-color:#ea580c}.csl{background:#f5f3ff;border-color:#7c3aed}.recall{background:#fdf2f8;border-color:#db2777}.rest{background:#f8fafc;border-color:#cbd5e1}.reward{background:#fffbeb;border-color:#ca8a04}.other{background:#f1f5f9}.rest,.reward{padding:3px 5px}.recall-strip{margin-top:3px;padding:3px;background:#fce7f3;color:#9d174d;border-radius:2px;font-size:7px}.week .block{padding:3px 4px;margin-bottom:2px;line-height:1.1}.week .time{font-size:7px;line-height:8px;margin-bottom:1px}.week b{display:block;font-size:8px;line-height:9px}.week .topic{font-size:7px;line-height:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.week .block small{font-size:6px;line-height:7px}.week .recall-strip{font-size:6px;line-height:7px;padding:2px;margin-top:2px}.guide{break-before:page}.guide h2{font-size:17px}.techniques{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.techniques section{background:#f8fafc;padding:12px;border-radius:8px}.guide p,.guide li{font-size:11px;line-height:1.7}.review-table{width:100%;border-collapse:collapse;margin-top:12px}.review-table th,.review-table td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left;font-size:10px}.note{margin-top:12px;font-size:9px;color:#64748b}.legend{margin-top:8px;font-size:8px;color:#475569}</style></head><body><header><div class="school">${schoolLogo ? `<img alt="School logo" src="${schoolLogo}"/>` : ""}<div><strong>${esc(data.student.school.name)}</strong><div class="meta">${esc(data.student.name)} · ${esc(data.student.grade)}${data.student.admission_number ? " · " + esc(data.student.admission_number) : ""}</div></div></div><div><h1>Weekly Study Plan</h1><div class="meta">${esc(plan.week_start)} to ${esc(plan.days[6].date)} · Africa/Nairobi</div></div><div class="brand"><img alt="Assignment Hub" src="${brand}"/></div></header><p class="quote">“${esc(plan.quote)}”</p><div class="week">${plan.days
    .map(
      (day) =>
        `<section class="day"><div class="day-title">${day.day}<span class="date">${day.date}</span></div>${day.blocks
          .filter((b) => b.activity_type !== "RECALL")
          .map((b) =>
            card(
              b,
              day.blocks.find(
                (r) =>
                  r.activity_type === "RECALL" && r.study_block_id === b.id,
              ),
            ),
          )
          .join("")}</section>`,
    )
    .join(
      "",
    )}</div><div class="legend">Blue: Mathematics · Green: Science · Orange: Languages · Purple: CSL · Pink: Active recall · Gray: Rest · Gold: Reward</div><section class="guide"><header><h2>Your study guide</h2><span>Assignment Hub · ${esc(data.student.name)}</span></header><div class="techniques"><section><b>Spaced Repetition</b><p>Reviewing at increasing intervals. Follow the planned 1-, 3- and 7-day reviews; later reviews carry into the following week.</p></section><section><b>Interleaving</b><p>Mixing topics for better recall. Compare problem types and practise choosing the right method.</p></section><section><b>Active Recall</b><p>Testing yourself, not re-reading. Close your notes, answer 3–5 questions, then explain any corrections.</p></section><section><b>Pomodoro</b><p>25 minutes of focus: 20 minutes of study plus 5 minutes of recall. Rest for 5 minutes, or 15 after two cycles. A reward follows every third cycle.</p></section></div><h2>Reviews to carry forward</h2>${plan.next_week_reviews.length ? `<table class="review-table"><thead><tr><th>Date due</th><th>Subject</th><th>Topic</th><th>Review interval</th></tr></thead><tbody>${plan.next_week_reviews.map((r) => `<tr><td>${r.due_date}</td><td>${esc(r.subject)}</td><td>${esc(r.topic)}</td><td>Day ${r.offset_days} review</td></tr>`).join("")}</tbody></table>` : "<p>Your next plan will use your updated results and review history.</p>"}<h2>Recall without a published quiz</h2><ol><li>Explain the main idea from memory.</li><li>Solve, write or demonstrate one example without notes.</li><li>Check your work and explain one correction.</li></ol>${plan.warnings.map((w) => `<p class="note">${esc(w)}</p>`).join("")}<p class="note">School commitments are reserved, and personal-time blocks are not study requirements.</p></section></body></html>`;
}
@Injectable()
export class TimetablePdfService {
  private busy = false;
  constructor(
    private readonly branding: CslPhotoService,
    private readonly config: ConfigService,
  ) {}
  async render(data: any) {
    if (this.busy)
      throw new ServiceUnavailableException(
        "Another study plan is rendering. Please retry shortly.",
      );
    this.busy = true;
    let browser;
    try {
      const logo = await readFile(
        join(__dirname, "assets", "assignment-hub.png"),
      );
      const schoolLogo = data.student.independent
        ? null
        : data.school.logoUrl
          ? await this.branding.schoolLogo(data.school.logoUrl)
          : null;
      const html = timetableHtml(
        data,
        "data:image/png;base64," + logo.toString("base64"),
        schoolLogo,
      );
      browser = await puppeteer.launch({
        executablePath:
          this.config.get<string>("TIMETABLE_CHROMIUM_EXECUTABLE") ||
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
        await page.pdf({
          format: "A4",
          landscape: true,
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate:
            '<div style="font:8px Arial;width:100%;text-align:center;color:#64748b">Generated by Assignment Hub — Powered by AI Study Coach · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
          timeout: 30000,
        }),
      );
    } finally {
      if (browser) await browser.close().catch(() => {});
      this.busy = false;
    }
  }
}
