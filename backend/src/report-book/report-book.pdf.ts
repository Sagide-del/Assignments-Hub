import { Injectable } from "@nestjs/common";
import PDFDocument = require("pdfkit");
import { join } from "path";
import { CslPhotoService } from "../csl/csl-photo.service";
@Injectable()
export class ReportBookPdfService {
  constructor(private readonly branding: CslPhotoService) {}
  async render(card: any) {
    const school = card.school_json as any;
    const logo = school.logoUrl
      ? await this.branding.schoolLogo(school.logoUrl)
      : null;
    return renderReportCard(card, logo);
  }
}
export function renderReportCard(
  c: any,
  logo: string | null = null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        size: "A4",
        margin: 36,
        bufferPages: true,
        info: { Title: "School Report Card", Author: "Assignment Hub Kenya" },
      }),
      chunks: Buffer[] = [];
    doc.on("data", (b) => chunks.push(b));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont(
      "Body",
      join(
        __dirname,
        "..",
        "study-hub",
        "assets",
        "report-open-sans-regular.ttf",
      ),
    );
    doc.registerFont(
      "Strong",
      join(
        __dirname,
        "..",
        "study-hub",
        "assets",
        "report-open-sans-semibold.ttf",
      ),
    );
    const green = "#153f33",
      muted = "#65746e",
      s = c.school_json,
      student = c.student_json,
      subjects = c.subjects_json;
    const line = (
      v: unknown,
      x: number,
      y: number,
      width: number,
      size = 10,
      bold = false,
      color = green,
    ) =>
      doc
        .font(bold ? "Strong" : "Body")
        .fontSize(size)
        .fillColor(color)
        .text(String(v ?? ""), x, y, {
          width,
          height: size * 2.6,
          ellipsis: true,
        });
    const title = () => {
      doc.rect(0, 0, 596, 8).fill(green);
      if (logo)
        doc.image(Buffer.from(logo.split(",")[1], "base64"), 36, 26, {
          fit: [56, 56],
        });
      const x = logo ? 104 : 36;
      line(s.name, x, 28, 455 - (logo ? 60 : 0), 20, true);
      line(s.address ?? "", x, 62, 455, 9, false, muted);
      line("TERM REPORT CARD", 36, 103, 345, 11, true);
      line(
        `${c.status} · Revision ${c.revision}`,
        390,
        104,
        169,
        9,
        true,
        c.status === "PUBLISHED" ? green : "#a85b13",
      );
      doc.moveTo(36, 128).lineTo(559, 128).strokeColor("#dce6df").stroke();
    };
    title();
    line(student.name, 36, 143, 523, 18, true);
    line(
      `Admission: ${student.admissionNumber ?? "—"}    ${student.grade} · Stream ${student.stream}`,
      36,
      174,
      523,
      10,
    );
    line(
      `${c.period.term} · ${c.period.year}    |    ${c.policy_json.confirmed ? "School-approved grading policy" : "Grading preset — school confirmation required"}`,
      36,
      195,
      523,
      9,
      false,
      muted,
    );
    let y = 229;
    const tableHead = () => {
      doc.roundedRect(36, y, 523, 27, 4).fill(green);
      line("SUBJECT", 46, y + 7, 156, 9, true, "#ffffff");
      line("SCORE %", 208, y + 7, 65, 9, true, "#ffffff");
      line("LEVEL", 280, y + 7, 54, 9, true, "#ffffff");
      line("TEACHER REMARK", 343, y + 7, 205, 9, true, "#ffffff");
      y += 34;
    };
    tableHead();
    for (const row of subjects) {
      doc.font("Body").fontSize(9);
      const remark = row.remark || (!row.complete ? "Marks pending" : "—");
      const h =
        Math.max(
          23,
          doc.heightOfString(row.subject, { width: 152 }),
          doc.heightOfString(remark, { width: 203 }),
        ) + 9;
      if (y + h > 706) {
        doc.addPage();
        title();
        y = 147;
        tableHead();
      }
      doc
        .roundedRect(36, y - 3, 523, h, 3)
        .fill(subjects.indexOf(row) % 2 === 0 ? "#f2f6f2" : "#ffffff");
      doc
        .font("Strong")
        .fontSize(10)
        .fillColor(green)
        .text(row.subject, 46, y + 4, { width: 152 });
      line(
        row.score === null ? "Pending" : Number(row.score).toFixed(1),
        208,
        y + 4,
        65,
        10,
        true,
      );
      line(row.grade, 280, y + 4, 54, 10, true);
      doc
        .font("Body")
        .fontSize(9)
        .fillColor(muted)
        .text(remark, 343, y + 4, { width: 203 });
      y += h + 4;
    }
    if (y + 190 > 757) {
      doc.addPage();
      title();
      y = 150;
    }
    doc.roundedRect(36, y + 10, 523, 52, 6).fill("#eaf2e9");
    line(
      `Total: ${c.total_score === null ? "Pending" : c.total_score + " / " + subjects.length * 100}`,
      48,
      y + 20,
      180,
      11,
      true,
    );
    line(
      `Average: ${c.average_score === null ? "Pending" : c.average_score + "%"}`,
      238,
      y + 20,
      160,
      11,
      true,
    );
    line(
      c.class_position
        ? `Position: ${c.class_position} / ${c.cohort_size}`
        : "Not ranked",
      435,
      y + 20,
      112,
      10,
      true,
    );
    y += 80;
    const comment = (title: string, value: string | null) => {
      doc.font("Body").fontSize(10);
      const h = Math.max(
        38,
        doc.heightOfString(value || "Not entered.", { width: 499 }) + 27,
      );
      if (y + h > 760) {
        doc.addPage();
        titlePage();
        y = 150;
      }
      line(title, 36, y, 523, 10, true);
      doc
        .font("Body")
        .fontSize(10)
        .fillColor(muted)
        .text(value || "Not entered.", 36, y + 20, { width: 523 });
      y += h + 16;
    };
    const titlePage = title;
    comment("CLASS TEACHER’S COMMENT", c.teacher_comment);
    comment("PRINCIPAL’S COMMENT", c.principal_comment);
    if (y + 38 > 760) {
      doc.addPage();
      title();
      y = 150;
    }
    line("Class Teacher: ____________________", 36, y + 5, 260, 9);
    line("Principal: ____________________", 314, y + 5, 245, 9);
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(36, 785).lineTo(559, 785).strokeColor("#dce6df").stroke();
      line(
        c.status === "PUBLISHED"
          ? "Generated by Assignment Hub Kenya · School-approved report"
          : "Generated by Assignment Hub Kenya · DRAFT — not an issued report",
        36,
        795,
        460,
        7,
        false,
        muted,
      );
      line(`${i + 1} / ${range.count}`, 518, 795, 41, 7, false, muted);
    }
    doc.end();
  });
}
