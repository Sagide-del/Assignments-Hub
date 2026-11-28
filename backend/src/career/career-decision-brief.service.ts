import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

const INK = "#10251f";
const LIME = "#b5e61d";
const MUTED = "#52635e";

@Injectable()
export class CareerDecisionBriefService {
  async render(input: { student: { name: string; grade: string | null }; guide: any }): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 46, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
    const results = Array.isArray(input.guide.scores) ? input.guide.scores : [];
    const matches = (Array.isArray(input.guide.matches) ? input.guide.matches : []).slice(0, 3);

    doc.rect(0, 0, doc.page.width, 110).fill(INK);
    doc.rect(0, 104, doc.page.width, 6).fill(LIME);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(21).text("Assignment Hub", 46, 34);
    doc.fillColor("#dce8e3").font("Helvetica").fontSize(10).text("Grade 10 parent and teacher decision brief", 46, 61);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(16).text(input.student.name, 46, 132);
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(`${input.student.grade ?? "Grade 9"} • Prepared ${new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}`, 46, 155);
    this.heading(doc, "What this brief is for");
    doc.font("Helvetica").fontSize(10.5).fillColor(MUTED).text("Use this summary during a calm conversation with a teacher or career adviser. It shows planning signals from the learner's recorded results and shortlist; it is not a placement decision or an official subject availability list.", { lineGap: 4 });
    this.heading(doc, "Current shortlist");
    const choice = input.guide.choice;
    if (choice?.combination) {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(`${choice.combination.code} • ${choice.combination.pathway}`);
      doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`Subjects: ${(choice.combination.subjects ?? []).join(", ")}`);
    } else if (choice?.track) {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(`${choice.track.name} • ${choice.track.pathway}`);
    } else {
      doc.font("Helvetica").fontSize(10.5).fillColor(MUTED).text("No option has been shortlisted yet. Compare the three options below, then save one as a discussion starting point.");
    }
    this.heading(doc, "Evidence on hand");
    if (results.length) results.slice(0, 12).forEach((result: any) => {
      const value = typeof result.percentage === "number" ? `${result.percentage}%` : result.performance_level ?? "Recorded";
      doc.font("Helvetica").fontSize(10).fillColor(INK).text(`${result.subject}: `, { continued: true }).fillColor(MUTED).text(value);
    });
    else doc.font("Helvetica").fontSize(10.5).fillColor(MUTED).text("No Grade 9 result has been saved yet. Add the performance levels or percentages shown on the learner's report before the meeting.");
    this.heading(doc, "Three options worth discussing");
    matches.forEach((match: any, index: number) => {
      if (doc.y > 650) doc.addPage();
      const top = doc.y;
      doc.roundedRect(46, top, 503, 72, 8).fillAndStroke("#f4f7ef", "#dbe6c9");
      doc.fillColor("#648000").font("Helvetica-Bold").fontSize(9).text(`OPTION ${index + 1}`, 60, top + 12);
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(11).text(`${match.code} • ${match.pathway}`, 60, top + 28);
      doc.fillColor(MUTED).font("Helvetica").fontSize(9.5).text((match.subjects ?? []).join(" • "), 60, top + 46, { width: 460 });
      doc.y = top + 84;
    });
    this.heading(doc, "Questions to take to school");
    ["Which of these subject combinations is available at this school next year?", "What evidence suggests this pathway suits the learner's strengths and interests?", "Which two subjects need focused support before Grade 10?", "What should the learner try this term before making a final choice?"].forEach((question, index) => doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`${index + 1}. ${question}`, { lineGap: 4 }));
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text("Assignment Hub • Decision support, not a placement decision", 46, doc.page.height - 38);
      doc.text(`Page ${i + 1} of ${pages.count}`, 46, doc.page.height - 38, { align: "right" });
    }
    doc.end();
    return done;
  }

  private heading(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(1.5).font("Helvetica-Bold").fontSize(12).fillColor(INK).text(title);
    doc.moveDown(0.35);
  }
}
