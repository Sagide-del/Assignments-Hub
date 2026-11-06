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
      message: this.diagnosis(scores, weak),
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
        scores.map((row) => [row.subject, this.technique(row.percentage)]),
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
      const match = line.match(
        /^\s*([A-Za-z][A-Za-z &/-]{2,60}?)\s*[:\-]?\s*(\d{1,3})(?:\s*\/\s*(\d{1,3})|\s*%)?\s*$/,
      );
      if (!match) continue;
      const subject = match[1].replace(/\s+/g, " ").trim();
      const score = Number(match[2]);
      const maximum = match[3] ? Number(match[3]) : 100;
      const percentage =
        maximum > 0 ? Math.round((score / maximum) * 100) : score;
      if (percentage > 100 || seen.has(subject.toLowerCase())) continue;
      seen.add(subject.toLowerCase());
      scores.push({ subject, percentage });
    }
    return scores.slice(0, 30);
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

  private diagnosis(scores: Score[], weak: string[]) {
    const average = Math.round(
      scores.reduce((sum, row) => sum + row.percentage, 0) / scores.length,
    );
    if (!weak.length)
      return `You have a solid starting point with an average of ${average}%. Keep practising the subjects closest to 70% so they become reliable strengths.`;
    return `Your report shows that ${weak.join(", ")} need focused practice. This is a starting point, not a label: use short, repeated practice sessions and review each mistake before moving on.`;
  }
  private technique(score: number) {
    if (score < 40)
      return "Worked examples, then explain each step aloud before attempting one short question.";
    if (score < 70)
      return "Active recall: answer without notes, correct the gap, then retry after a short break.";
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
          learningTechnique: this.technique(target.percentage),
          activity:
            "Learn one worked example, recall without notes, then correct one misconception.",
        };
      },
    );
  }
}
