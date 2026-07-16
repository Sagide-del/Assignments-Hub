import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const BRAND_PRIMARY = '#212428';
const BRAND_SECONDARY = '#BBD125';
const BRAND_TEXT_SECONDARY = '#4a5568';
const BRAND_LIGHT_BG = '#f7f8fa';

type Career = { title: string; description?: string; salaryMinKES: number; salaryMaxKES: number };
type UniversityKenya = { name: string; programs: string[] };
type UniversityIntl = { name: string; country: string; programs: string[] };
type SubjectRequirement = { subject: string; minGrade: string };

interface TrackForReport {
  name: string;
  description: string;
  requiredSubjects: unknown;
  minMeanGrade: string | null;
  careers: unknown;
  skills: unknown;
  jobOutlook: string | null;
  jobGrowthRate: string | null;
  universitiesKenya: unknown;
  universitiesIntl: unknown;
  degreeDurationYears: number | null;
  nextSteps: unknown;
  extracurriculars: unknown;
  certifications: unknown;
  workExperience: unknown;
  pathway: { name: string; icon: string; colorHex: string };
}

interface SelectionForReport {
  createdAt: Date;
  notes: string | null;
  isActive: boolean;
  track: TrackForReport;
}

interface StudentSummaryForReport {
  student: { name: string; grade: string | null; school: { name: string } | null };
  current: SelectionForReport | null;
  history: SelectionForReport[];
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

@Injectable()
export class PathwaysReportService {
  /**
   * Renders a student's career pathway selection (or lack of one) as a
   * polished, printable PDF — used by both the student's own "Download
   * Report" button and a teacher/admin pulling one student's report.
   * PDFKit is used (rather than a headless-browser HTML-to-PDF approach)
   * because it's pure JS with no native/Chromium dependency, which keeps
   * this cheap to run on a small API server.
   */
  async buildStudentReport(summary: StudentSummaryForReport): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    this.renderHeader(doc, summary);

    if (!summary.current) {
      doc
        .moveDown(2)
        .fontSize(13)
        .fillColor(BRAND_TEXT_SECONDARY)
        .text(
          `${summary.student.name} has not selected a Senior School career pathway yet. Once a track is selected, this report will show its full details: required subjects, career options, universities, and next steps.`,
          { align: 'left' },
        );
      this.renderFooter(doc);
      doc.end();
      return done;
    }

    const track = summary.current.track;
    this.renderCurrentSelection(doc, summary.current);
    this.renderRequiredSubjects(doc, track);
    this.renderCareers(doc, track);
    this.renderSkillsAndOutlook(doc, track);
    this.renderUniversities(doc, track);
    this.renderNextSteps(doc, track);
    if (summary.history.length > 1) {
      this.renderHistory(doc, summary.history);
    }

    this.renderFooter(doc);
    doc.end();
    return done;
  }

  private renderHeader(doc: PDFKit.PDFDocument, summary: StudentSummaryForReport) {
    doc.rect(0, 0, doc.page.width, 8).fill(BRAND_SECONDARY);
    doc.moveDown(1.5);

    doc.fontSize(20).fillColor(BRAND_PRIMARY).font('Helvetica-Bold').text('Assignments Hub', 50, 40);
    doc.fontSize(10).fillColor(BRAND_TEXT_SECONDARY).font('Helvetica').text('Career Pathway Report', 50, 64);

    doc.moveDown(2);
    doc.fontSize(16).fillColor(BRAND_PRIMARY).font('Helvetica-Bold').text('Career Pathway Assessment');
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(BRAND_TEXT_SECONDARY)
      .text(
        `${summary.student.name}${summary.student.grade ? ` — ${summary.student.grade}` : ''}${summary.student.school ? ` — ${summary.student.school.name}` : ''}`,
      );
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    doc.moveDown(1);
    this.hr(doc);
  }

  private renderCurrentSelection(doc: PDFKit.PDFDocument, current: SelectionForReport) {
    const track = current.track;
    doc.moveDown(1);
    doc.fontSize(9).fillColor(track.pathway.colorHex || BRAND_SECONDARY).font('Helvetica-Bold').text(track.pathway.name.toUpperCase());
    doc.fontSize(18).fillColor(BRAND_PRIMARY).font('Helvetica-Bold').text(track.name);
    doc.fontSize(11).fillColor(BRAND_TEXT_SECONDARY).font('Helvetica').text(track.description);
    doc
      .fontSize(9)
      .fillColor(BRAND_TEXT_SECONDARY)
      .text(
        `Selected on ${new Date(current.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      );
    if (current.notes) {
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor(BRAND_PRIMARY).font('Helvetica-Bold').text('Why I chose this:');
      doc.fontSize(10).fillColor(BRAND_TEXT_SECONDARY).font('Helvetica').text(current.notes);
    }
    doc.moveDown(1);
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor(BRAND_PRIMARY).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
  }

  private renderRequiredSubjects(doc: PDFKit.PDFDocument, track: TrackForReport) {
    const subjects = asArray<SubjectRequirement>(track.requiredSubjects);
    if (subjects.length === 0) return;
    this.sectionTitle(doc, 'Required Subjects (KCSE)');
    doc.fontSize(10).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY);
    subjects.forEach((s) => doc.text(`•  ${s.subject} — minimum grade ${s.minGrade}`));
    if (track.minMeanGrade) doc.text(`•  Overall mean grade — minimum ${track.minMeanGrade}`);
  }

  private renderCareers(doc: PDFKit.PDFDocument, track: TrackForReport) {
    const careers = asArray<Career>(track.careers);
    if (careers.length === 0) return;
    this.sectionTitle(doc, 'Career Options');
    careers.forEach((c) => {
      if (doc.y > doc.page.height - 100) doc.addPage();
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND_PRIMARY).text(c.title, { continued: false });
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor(BRAND_TEXT_SECONDARY)
        .text(`${formatKES(c.salaryMinKES)} - ${formatKES(c.salaryMaxKES)} / month`);
      if (c.description) doc.fontSize(9.5).fillColor(BRAND_TEXT_SECONDARY).text(c.description);
      doc.moveDown(0.4);
    });
  }

  private renderSkillsAndOutlook(doc: PDFKit.PDFDocument, track: TrackForReport) {
    const skills = asArray<string>(track.skills);
    this.sectionTitle(doc, 'Skills You\'ll Develop');
    doc.fontSize(10).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY).text(skills.join('  •  '));

    if (track.jobOutlook || track.jobGrowthRate) {
      this.sectionTitle(doc, 'Job Outlook');
      if (track.jobOutlook) doc.fontSize(10).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY).text(track.jobOutlook);
      if (track.jobGrowthRate) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_PRIMARY).text(`Projected growth: ${track.jobGrowthRate}`);
      }
    }
  }

  private renderUniversities(doc: PDFKit.PDFDocument, track: TrackForReport) {
    const kenya = asArray<UniversityKenya>(track.universitiesKenya);
    const intl = asArray<UniversityIntl>(track.universitiesIntl);

    if (kenya.length) {
      this.sectionTitle(doc, 'Recommended Universities — Kenya');
      doc.fontSize(10).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY);
      kenya.forEach((u) => doc.text(`•  ${u.name}: ${u.programs.join(', ')}`));
    }
    if (intl.length) {
      this.sectionTitle(doc, 'Recommended Universities — International');
      doc.fontSize(10).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY);
      intl.forEach((u) => doc.text(`•  ${u.name} (${u.country}): ${u.programs.join(', ')}`));
    }
    if (track.degreeDurationYears) {
      doc.moveDown(0.3);
      doc
        .fontSize(9.5)
        .fillColor(BRAND_TEXT_SECONDARY)
        .text(`Typical degree duration: ${track.degreeDurationYears} years`);
    }
  }

  private renderNextSteps(doc: PDFKit.PDFDocument, track: TrackForReport) {
    const lists: [string, unknown][] = [
      ['Next Steps', track.nextSteps],
      ['Extra-Curricular Activities', track.extracurriculars],
      ['Certifications Worth Pursuing', track.certifications],
      ['Work Experience Opportunities', track.workExperience],
    ];
    for (const [title, raw] of lists) {
      const items = asArray<string>(raw);
      if (items.length === 0) continue;
      this.sectionTitle(doc, title);
      doc.fontSize(10).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY);
      items.forEach((item) => doc.text(`•  ${item}`));
    }
  }

  private renderHistory(doc: PDFKit.PDFDocument, history: SelectionForReport[]) {
    this.sectionTitle(doc, 'Selection History');
    doc.fontSize(9.5).font('Helvetica').fillColor(BRAND_TEXT_SECONDARY);
    history.forEach((h) => {
      const date = new Date(h.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
      const status = h.isActive ? ' (current)' : '';
      doc.text(`•  ${date} — ${h.track.pathway.name} / ${h.track.name}${status}`);
    });
  }

  private renderFooter(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - 40;
      doc
        .fontSize(8)
        .fillColor(BRAND_TEXT_SECONDARY)
        .font('Helvetica')
        .text('Developed by SA Technologies 2026 v1.0', 50, bottom, { align: 'left', lineBreak: false });
      doc.text(`Page ${i + 1} of ${range.count}`, 50, bottom, { align: 'right', lineBreak: false });
    }
  }

  private hr(doc: PDFKit.PDFDocument) {
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#e2e8f0')
      .stroke();
  }
}
