import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PDFParse } from "pdf-parse";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { DocumentOcrService } from "../document-processing/document-ocr.service";
import { ConfirmReportCardDto } from "./dto/confirm-report-card.dto";

type Score = { subject: string; percentage: number };

// Keep OCR constrained to subjects that the platform can actually coach. This
// prevents headers, phone numbers and teacher remarks becoming fake subjects.
const REPORT_SUBJECTS = [
  "English", "Kiswahili", "Mathematics", "Integrated Science", "Biology",
  "Chemistry", "Physics", "Computer Studies", "Community Service Learning",
  "Social Studies", "Religious Education", "Christian Religious Education",
  "Islamic Religious Education", "Agriculture", "Business Studies", "Geography",
  "History", "Home Science", "Pre-Technical Studies", "Life Skills",
  "Art and Craft", "Music", "French", "German",
] as const;

@Injectable()
export class ReportCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly audit: AuditService,
    private readonly ocr: DocumentOcrService,
  ) {}

  async list(actor: AuthenticatedUser) {
    return this.prisma.learningCoachReportCard.findMany({
      where: { schoolId: actor.schoolId, studentId: actor.id },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        status: true,
        extractedScores: true,
        diagnosis: true,
        analyzedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async upload(file: Express.Multer.File, actor: AuthenticatedUser) {
    // Keep this under the existing private uploads prefix so the deployed
    // least-privilege uploader policy can store it without marketplace access.
    const uploaded = await this.uploads.uploadPrivate(
      file,
      `uploads/learning-coach-report-cards/${actor.schoolId}/${actor.id}`,
    );
    const candidates = await this.extractScores(file, uploaded.assetKey);
    const report = await this.prisma.learningCoachReportCard.create({
      data: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        assetKey: uploaded.assetKey,
        fileName: uploaded.filename,
        fileSize: uploaded.size,
        status: candidates.length
          ? "AWAITING_CONFIRMATION"
          : "NEEDS_MANUAL_ENTRY",
        extractedScores: candidates as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        status: true,
        extractedScores: true,
        createdAt: true,
      },
    });
    await this.audit.record({
      action: "learning_coach.report_card_uploaded",
      userId: actor.id,
      schoolId: actor.schoolId,
      resource: `LearningCoachReportCard:${report.id}`,
      metadata: { extractedScoreCount: candidates.length },
    });
    return report;
  }

  async previewUrl(id: number, actor: AuthenticatedUser) {
    const report = await this.prisma.learningCoachReportCard.findFirst({
      where: { id, schoolId: actor.schoolId, studentId: actor.id },
      select: { assetKey: true, fileName: true },
    });
    if (!report) throw new NotFoundException("Report card not found");

    return {
      url: await this.uploads.createPrivatePreviewUrl(report.assetKey, 300),
    };
  }

  async confirm(
    id: number,
    dto: ConfirmReportCardDto,
    actor: AuthenticatedUser,
  ) {
    const report = await this.prisma.learningCoachReportCard.findFirst({
      where: { id, schoolId: actor.schoolId, studentId: actor.id },
    });
    if (!report) throw new NotFoundException("Report card not found");
    const scores = this.cleanScores(dto.scores);
    if (!scores.length)
      throw new BadRequestException(
        "Enter at least one subject score between 0 and 100.",
      );

    const weak = scores
      .filter((row) => row.percentage < 40)
      .map((row) => row.subject);
    const strong = scores
      .filter((row) => row.percentage >= 70)
      .map((row) => row.subject);
    const focus =
      [...scores].sort((a, b) => a.percentage - b.percentage)[0]?.subject ??
      null;
    const diagnosis = {
      message: this.diagnosis(scores, weak, strong, actor.name),
      colorCodes: scores.map((row) => ({
        ...row,
        color:
          row.percentage >= 70
            ? "GREEN"
            : row.percentage >= 40
              ? "YELLOW"
              : "RED",
      })),
      learningTechniques: Object.fromEntries(
        scores.map((row) => [row.subject, this.technique(row.subject, row.percentage)]),
      ),
    };
    const periodKey = `learner-report-${id}`;
    const timetable = this.timetable(scores);
    await this.prisma.$transaction(async (tx) => {
      await tx.learningCoachReportCard.update({
        where: { id },
        data: {
          status: "ANALYZED",
          extractedScores: scores as unknown as Prisma.InputJsonValue,
          diagnosis: diagnosis as unknown as Prisma.InputJsonValue,
          analyzedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: actor.id },
        data: {
          weakSubjects: weak,
          strongSubjects: strong,
          primarySkillFocus: focus,
        },
      });
      await tx.studentStudyPlan.upsert({
        where: { studentId_periodKey: { studentId: actor.id, periodKey } },
        create: {
          schoolId: actor.schoolId,
          studentId: actor.id,
          periodKey,
          weakSubjects: scores
            .filter((row) => row.percentage < 50)
            .map((row) => ({
              ...row,
              priority: row.percentage < 30 ? "HIGH" : "MEDIUM",
            })) as unknown as Prisma.InputJsonValue,
          timetable: timetable as unknown as Prisma.InputJsonValue,
          recommendations:
            diagnosis.learningTechniques as unknown as Prisma.InputJsonValue,
        },
        update: {
          weakSubjects: scores
            .filter((row) => row.percentage < 50)
            .map((row) => ({
              ...row,
              priority: row.percentage < 30 ? "HIGH" : "MEDIUM",
            })) as unknown as Prisma.InputJsonValue,
          timetable: timetable as unknown as Prisma.InputJsonValue,
          recommendations:
            diagnosis.learningTechniques as unknown as Prisma.InputJsonValue,
        },
      });
    });
    await this.audit.record({
      action: "learning_coach.report_card_analyzed",
      userId: actor.id,
      schoolId: actor.schoolId,
      resource: `LearningCoachReportCard:${id}`,
      metadata: { subjects: scores.map((row) => row.subject) },
    });
    return {
      reportId: id,
      scores,
      weakSubjects: weak,
      strongSubjects: strong,
      primarySkillFocus: focus,
      diagnosis,
      timetable,
    };
  }

  private async extractScores(
    file: Express.Multer.File,
    storageKey: string,
  ): Promise<Score[]> {
    if (file.mimetype === "application/pdf") {
      const parser = new PDFParse({ data: file.buffer });
      try {
        const extracted = this.parseText((await parser.getText()).text);
        if (extracted.length) return extracted;
      } catch {
        // A scanned PDF has no embedded text. The optional OCR path below can
        // still provide a confirmation table when it is enabled for the host.
      } finally {
        await parser.destroy();
      }
      try {
        return this.parseText(await this.ocr.extractPdf(file.buffer, storageKey));
      } catch {
        return [];
      }
    }

    try {
      const rows = await this.ocr.extractImageTables(file.buffer);
      const tableScores = this.parseTableRows(rows);
      if (tableScores.length) return tableScores;
      return this.parseText(await this.ocr.extractImage(file.buffer));
    } catch {
      // Manual score entry remains available when OCR is intentionally off or
      // the image is not readable enough for a reliable result.
      return [];
    }
  }

  private parseText(text: string) {
    const scores: Score[] = [];
    const seen = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
      const subject = this.resolveSubject(line);
      const percentage = this.percentageFrom(line);
      if (!subject || percentage === null || seen.has(subject.toLowerCase())) continue;
      seen.add(subject.toLowerCase());
      scores.push({ subject, percentage });
    }
    return scores.slice(0, 30);
  }

  private parseTableRows(rows: string[][]) {
    const scores: Score[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const subject = this.resolveSubject(row[0] ?? row.join(' '));
      if (!subject || seen.has(subject.toLowerCase())) continue;
      // In the common report-card layout the first percentage after the
      // learning area is the assessment mark. Rubric numbers remain ignored.
      const percentage = row.slice(1).map((cell) => this.percentageFrom(cell)).find(
        (value): value is number => value !== null,
      );
      if (percentage === undefined) continue;
      seen.add(subject.toLowerCase());
      scores.push({ subject, percentage });
    }
    return scores.slice(0, 30);
  }

  private percentageFrom(value: string): number | null {
    const percent = value.match(/\b(\d{1,3})\s*%/);
    if (percent) {
      const score = Number(percent[1]);
      return score <= 100 ? score : null;
    }
    const fraction = value.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
    if (fraction) {
      const score = Number(fraction[1]);
      const maximum = Number(fraction[2]);
      return maximum > 0 ? Math.round((score / maximum) * 100) : null;
    }
    return null;
  }

  private resolveSubject(value: string): string | null {
    const candidate = this.normalise(value);
    if (candidate.length < 4) return null;
    let closest: { subject: string; distance: number } | null = null;
    for (const subject of REPORT_SUBJECTS) {
      const expected = this.normalise(subject);
      const distance = this.editDistance(candidate, expected);
      const prefix = candidate.startsWith(expected.slice(0, Math.max(5, expected.length - 4)))
        || expected.startsWith(candidate.slice(0, Math.max(5, candidate.length - 4)));
      if ((prefix || distance <= Math.max(2, Math.floor(expected.length * 0.2)))
        && (!closest || distance < closest.distance)) {
        closest = { subject, distance };
      }
    }
    return closest?.subject ?? null;
  }

  private normalise(value: string) {
    return value.toUpperCase().replace(/[^A-Z]/g, '');
  }

  private editDistance(left: string, right: string) {
    const row = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      let previous = row[0];
      row[0] = leftIndex;
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        const current = row[rightIndex];
        row[rightIndex] = Math.min(
          row[rightIndex] + 1,
          row[rightIndex - 1] + 1,
          previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
        );
        previous = current;
      }
    }
    return row[right.length];
  }

  private cleanScores(scores: Score[]) {
    const seen = new Set<string>();
    return scores
      .map((row) => ({
        subject: row.subject.trim().replace(/\s+/g, " "),
        percentage: Math.round(row.percentage),
      }))
      .filter(
        (row) =>
          row.subject.length >= 2 &&
          row.subject.length <= 80 &&
          row.percentage >= 0 &&
          row.percentage <= 100,
      )
      .filter((row) => {
        const key = row.subject.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private diagnosis(
    scores: Score[],
    weak: string[],
    strong: string[],
    learnerName: string,
  ) {
    const average = Math.round(
      scores.reduce((sum, row) => sum + row.percentage, 0) / scores.length,
    );
    const name = learnerName.trim().split(/\s+/)[0] || "Learner";
    if (!weak.length)
      return `${name}, you have a solid starting point with an average of ${average}%. Keep practising the subjects closest to 70% so they become reliable strengths.`;
    const strongest = [...scores].sort((left, right) => right.percentage - left.percentage)[0];
    const firstWeak = [...scores].sort((left, right) => left.percentage - right.percentage)[0];
    const strengthPhrase = strong.length && strongest
      ? `Your ${strongest.percentage}% in ${strongest.subject} is a real strength we can use.`
      : "You already have useful foundations to build from.";
    const bridge = weak.length > 1
      ? `We will start with ${firstWeak.subject} and then support ${weak.slice(1).join(", ")}.`
      : `We will start with ${firstWeak.subject} using short, guided practice sessions.`;
    return `${name}, ${strengthPhrase} ${bridge} This result is a starting point, not a label: each corrected mistake becomes the next step in your plan.`;
  }
  private technique(subject: string, score: number) {
    const key = this.normalise(subject);
    if (score < 40) {
      if (key === "MATHEMATICS") return "Feynman sprint: solve one worked example, then explain every step to a 10-year-old in a two-minute voice note.";
      if (key === "PHYSICS") return "Visualise first: open a motion or pendulum simulation, predict what will happen, then calculate one value without notes.";
      if (key === "CHEMISTRY") return "Particle story: draw the particles before balancing one equation, then explain what changed and what stayed conserved.";
      if (key === "BIOLOGY") return "Analogy game: compare the process to a familiar system, label a simple diagram, then retrieve it without looking.";
      return "Recovery loop: study one worked example, hide the notes, answer one short question, then correct one specific mistake.";
    }
    if (score < 70)
      return "Active recall loop: answer without notes, correct the gap, then retry after a short break.";
    return "Interleaved practice: mix this subject with a related topic and explain why each answer works.";
  }
  private timetable(scores: Score[]) {
    const focus = [...scores]
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3);
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"].map(
      (day, index) => {
        const target = focus[index % focus.length];
        return {
          day,
          startTime: index === 4 ? "10:00" : "18:30",
          durationMinutes: index === 4 ? 60 : 40,
          breakMinutes: 10,
          subject: target.subject,
          topic: `${target.subject} foundations`,
          subtopic: "Coach-selected practice",
          learningTechnique: this.technique(target.subject, target.percentage),
          activity:
            "Learn one worked example, recall without notes, then correct one misconception.",
        };
      },
    );
  }
}
