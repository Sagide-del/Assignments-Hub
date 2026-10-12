import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademicResultBatchStatus, Prisma, Role } from '@prisma/client';
import ExcelJS = require('exceljs');
import PDFDocument = require('pdfkit');
import { Readable } from 'stream';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { normalizeGrade } from '../common/utils/grade.util';
import { PrismaService } from '../prisma/prisma.service';
import { ImportAcademicResultsDto } from './dto/import-academic-results.dto';

interface ParsedResult {
  row: number;
  admissionNumber: string;
  subject: string;
  score: number;
  maxScore: number;
  gradeLabel?: string;
}

interface WeakSubject {
  subject: string;
  percentage: number;
  priority: 'HIGH' | 'MEDIUM';
}

@Injectable()
export class AcademicResultsService {
  private readonly weakThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const configured = Number(this.config.get('ACADEMIC_WEAK_SUBJECT_THRESHOLD') ?? 50);
    this.weakThreshold = Number.isFinite(configured) && configured > 0 && configured < 100 ? configured : 50;
  }

  async template() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Results');
    sheet.columns = [
      { header: 'Admission Number', key: 'admissionNumber', width: 22 },
      { header: 'Student Name', key: 'studentName', width: 28 },
      { header: 'Subject', key: 'subject', width: 24 },
      { header: 'Score', key: 'score', width: 14 },
      { header: 'Max Score', key: 'maxScore', width: 14 },
      { header: 'Grade', key: 'gradeLabel', width: 14 },
    ];
    sheet.addRow({ admissionNumber: 'ADM001', studentName: 'Example Learner', subject: 'Mathematics', score: 42, maxScore: 100, gradeLabel: 'D+' });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101820' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async import(file: Express.Multer.File, dto: ImportAcademicResultsDto, actor: AuthenticatedUser) {
    if (!file) throw new BadRequestException('Select an Excel or CSV results file');
    const parsed = await this.parseWorkbook(file);
    if (!parsed.length) throw new BadRequestException('No result rows were found');

    const admissionNumbers = [...new Set(parsed.map((row) => row.admissionNumber))];
    const students = await this.prisma.user.findMany({
      where: { schoolId: actor.schoolId, role: Role.STUDENT, admissionNumber: { in: admissionNumbers } },
      select: { id: true, admissionNumber: true, name: true },
    });
    const studentByAdmission = new Map(students.map((student) => [student.admissionNumber?.toLowerCase(), student]));
    const errors: Array<{ row: number; message: string }> = [];
    const valid = parsed.flatMap((row) => {
      const student = studentByAdmission.get(row.admissionNumber.toLowerCase());
      if (!student) {
        errors.push({ row: row.row, message: `Student ${row.admissionNumber} was not found in this school` });
        return [];
      }
      return [{ ...row, studentId: student.id }];
    });
    if (!valid.length) throw new BadRequestException({ message: 'No rows matched students in this school', errors });

    const normalizedGrade = normalizeGrade(dto.grade) ?? dto.grade.trim();
    const result = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.academicResultBatch.create({
        data: {
          schoolId: actor.schoolId,
          uploadedById: actor.id,
          name: dto.name.trim(),
          academicYear: dto.academicYear,
          term: dto.term.trim(),
          grade: normalizedGrade,
          className: dto.className?.trim() || null,
          stream: dto.stream?.trim() || null,
          fileName: file.originalname,
          status: AcademicResultBatchStatus.PROCESSING,
          errors: errors.length ? errors as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
        },
      });
      await tx.studentAcademicResult.createMany({
        data: valid.map((row) => ({
          schoolId: actor.schoolId,
          batchId: batch.id,
          studentId: row.studentId,
          subject: row.subject,
          score: row.score,
          maxScore: row.maxScore,
          percentage: Math.round((row.score / row.maxScore) * 1000) / 10,
          gradeLabel: row.gradeLabel || null,
        })),
        skipDuplicates: true,
      });
      const stored = await tx.studentAcademicResult.findMany({ where: { batchId: batch.id } });
      for (const studentId of [...new Set(stored.map((row) => row.studentId))]) {
        const studentResults = stored.filter((row) => row.studentId === studentId);
        await this.upsertStudyPlan(tx, {
          schoolId: actor.schoolId,
          studentId,
          batchId: batch.id,
          generatedById: actor.id,
          periodKey: `${dto.academicYear}-${dto.term.trim().toLowerCase().replace(/\s+/g, '-')}`,
          results: studentResults.map((row) => ({ subject: row.subject, percentage: row.percentage })),
        });
      }
      return tx.academicResultBatch.update({
        where: { id: batch.id },
        data: { status: AcademicResultBatchStatus.COMPLETED, rowCount: stored.length, completedAt: new Date() },
      });
    });
    return { success: true, batch: result, summary: { imported: result.rowCount, failed: errors.length, students: students.length }, errors };
  }

  async batches(actor: AuthenticatedUser) {
    const user = actor.role === Role.TEACHER
      ? await this.prisma.user.findUnique({ where: { id: actor.id }, select: { assignedClass: true } })
      : null;
    return this.prisma.academicResultBatch.findMany({
      where: {
        ...(actor.role === Role.PLATFORM_ADMIN ? {} : { schoolId: actor.schoolId }),
        ...(actor.role === Role.TEACHER && user?.assignedClass
          ? { OR: [{ className: user.assignedClass }, { grade: user.assignedClass }] }
          : {}),
      },
      include: { school: { select: { name: true, code: true } }, _count: { select: { results: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async analysis(id: number, actor: AuthenticatedUser) {
    const access = await this.assertBatchAccess(id, actor);
    const rows = await this.prisma.studentAcademicResult.findMany({
      where: { batchId: id, ...(access.subject ? { subject: { equals: access.subject, mode: 'insensitive' } } : {}) },
      include: { student: { select: { id: true, name: true, admissionNumber: true, studentProfile: { select: { className: true, stream: true } } } } },
      orderBy: [{ subject: 'asc' }, { percentage: 'desc' }],
    });
    return this.buildAnalysis(access.batch, rows);
  }

  async studentPlan(actor: AuthenticatedUser) {
    const plan = await this.prisma.studentStudyPlan.findFirst({
      where: { schoolId: actor.schoolId, studentId: actor.id },
      orderBy: { updatedAt: 'desc' },
    });
    const history = await this.prisma.studentAcademicResult.findMany({
      where: { schoolId: actor.schoolId, studentId: actor.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!plan) return { plan: null, subjectTrends: [], practiceAssignments: [] };
    const weakSubjects = this.jsonArray<WeakSubject>(plan.weakSubjects);
    const subjectTrends = weakSubjects.map((weak) => {
      const values = history.filter((row) => row.subject.toLowerCase() === weak.subject.toLowerCase()).map((row) => row.percentage);
      const latest = values.at(-1) ?? weak.percentage;
      const change = values.length > 1 ? latest - values[values.length - 2] : 0;
      return { subject: weak.subject, latest, change: Math.round(change * 10) / 10, projectedNext: Math.max(0, Math.min(100, Math.round((latest + change) * 10) / 10)), dataPoints: values.length };
    });
    const practiceAssignments = await this.prisma.assignment.findMany({
      where: {
        schoolId: actor.schoolId,
        isPublished: true,
        grade: actor.grade ?? undefined,
        subject: { in: weakSubjects.map((subject) => subject.subject), mode: 'insensitive' },
      },
      select: { id: true, title: true, subject: true, maxPoints: true, dueDate: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return { plan, subjectTrends, practiceAssignments };
  }

  async reportPdf(id: number, actor: AuthenticatedUser) {
    const data = await this.analysis(id, actor);
    const document = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    document.font('Helvetica-Bold').fontSize(20).fillColor('#101820').text('Academic Performance Report');
    document.moveDown(0.4).font('Helvetica').fontSize(10).fillColor('#52606D').text(`${data.batch.name} | ${data.batch.grade}${data.batch.stream ? ` ${data.batch.stream}` : ''} | ${data.batch.term} ${data.batch.academicYear}`);
    document.moveDown(1).font('Helvetica-Bold').fontSize(11).fillColor('#101820').text(`Learners: ${data.overview.studentCount}    Overall average: ${data.overview.averagePercentage}%    Below ${this.weakThreshold}%: ${data.overview.belowThreshold}`);
    document.moveDown(1).fontSize(14).text('Subject performance');
    for (const subject of data.subjectPerformance) {
      document.moveDown(0.5).font('Helvetica-Bold').fontSize(10).text(subject.subject);
      document.font('Helvetica').fillColor('#52606D').text(`Average ${subject.averagePercentage}% | Learners ${subject.studentCount} | Below target ${subject.belowThreshold}`);
    }
    document.addPage().font('Helvetica-Bold').fillColor('#101820').fontSize(14).text('Learners requiring support');
    document.moveDown(0.5);
    for (const learner of data.learnersNeedingSupport.slice(0, 60)) {
      document.font('Helvetica-Bold').fontSize(10).fillColor('#101820').text(`${learner.studentName} (${learner.admissionNumber ?? 'No admission number'})`);
      document.font('Helvetica').fillColor('#52606D').text(`${learner.subject}: ${learner.percentage}% | Priority: ${learner.percentage < 30 ? 'Immediate intervention' : 'Targeted practice'}`);
      document.moveDown(0.35);
    }
    document.moveDown().font('Helvetica-Bold').fillColor('#101820').fontSize(12).text('Teaching actions');
    document.font('Helvetica').fillColor('#52606D').fontSize(10).list(data.teachingActions);
    document.end();
    await new Promise<void>((resolve) => document.on('end', resolve));
    return { buffer: Buffer.concat(chunks), fileName: `${data.batch.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-performance.pdf` };
  }

  private async parseWorkbook(file: Express.Multer.File): Promise<ParsedResult[]> {
    const workbook = new ExcelJS.Workbook();
    const isCsv = file.mimetype.includes('csv') || file.originalname.toLowerCase().endsWith('.csv');
    if (isCsv) {
      await workbook.csv.read(Readable.from(file.buffer.toString('utf8')));
    } else {
      await workbook.xlsx.load(file.buffer as any);
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('The workbook does not contain a worksheet');
    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => headers.set(this.normalizeHeader(String(cell.value ?? '')), column));
    const admissionColumn = headers.get('admissionnumber') ?? headers.get('admission') ?? headers.get('studentid');
    if (!admissionColumn) throw new BadRequestException('The file must include an Admission Number column');
    const subjectColumn = headers.get('subject');
    const scoreColumn = headers.get('score') ?? headers.get('marks');
    const maxScoreColumn = headers.get('maxscore') ?? headers.get('totalmarks');
    const gradeColumn = headers.get('grade');
    const metadataHeaders = new Set(['admissionnumber', 'admission', 'studentid', 'studentname', 'name', 'class', 'stream', 'grade']);
    const rows: ParsedResult[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const admissionNumber = String(row.getCell(admissionColumn).text ?? '').trim();
      if (!admissionNumber) continue;
      if (subjectColumn && scoreColumn) {
        const subject = String(row.getCell(subjectColumn).text ?? '').trim();
        const score = Number(row.getCell(scoreColumn).value);
        const maxScore = maxScoreColumn ? Number(row.getCell(maxScoreColumn).value) : 100;
        if (subject && Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0 && score >= 0 && score <= maxScore) {
          rows.push({ row: rowNumber, admissionNumber, subject, score, maxScore, gradeLabel: gradeColumn ? String(row.getCell(gradeColumn).text ?? '').trim() : undefined });
        }
        continue;
      }
      for (const [header, column] of headers) {
        if (metadataHeaders.has(header)) continue;
        const raw = row.getCell(column).value;
        const score = Number(raw);
        if (raw != null && raw !== '' && Number.isFinite(score) && score >= 0 && score <= 100) {
          rows.push({ row: rowNumber, admissionNumber, subject: String(sheet.getRow(1).getCell(column).text).trim(), score, maxScore: 100 });
        }
      }
    }
    return rows;
  }

  private async assertBatchAccess(id: number, actor: AuthenticatedUser) {
    const batch = await this.prisma.academicResultBatch.findUnique({ where: { id }, include: { school: { select: { name: true, code: true } } } });
    if (!batch) throw new NotFoundException('Result batch not found');
    if (actor.role !== Role.PLATFORM_ADMIN && batch.schoolId !== actor.schoolId) throw new ForbiddenException("You cannot access another school's results");
    let subject: string | null = null;
    if (actor.role === Role.TEACHER) {
      const teacher = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { subject: true, assignedClass: true } });
      if (teacher?.assignedClass && batch.className && teacher.assignedClass.toLowerCase() !== batch.className.toLowerCase()) throw new ForbiddenException('This result batch is outside your assigned class');
      subject = teacher?.subject ?? null;
    }
    return { batch, subject };
  }

  private buildAnalysis(batch: any, rows: Array<any>) {
    const subjects = new Map<string, typeof rows>();
    for (const row of rows) subjects.set(row.subject, [...(subjects.get(row.subject) ?? []), row]);
    const subjectPerformance = [...subjects.entries()].map(([subject, subjectRows]) => ({
      subject,
      studentCount: new Set(subjectRows.map((row) => row.studentId)).size,
      averagePercentage: this.average(subjectRows.map((row) => row.percentage)),
      belowThreshold: subjectRows.filter((row) => row.percentage < this.weakThreshold).length,
    })).sort((a, b) => a.averagePercentage - b.averagePercentage);
    const learnersNeedingSupport = rows.filter((row) => row.percentage < this.weakThreshold).map((row) => ({
      studentId: row.studentId,
      studentName: row.student.name,
      admissionNumber: row.student.admissionNumber,
      className: row.student.studentProfile?.className ?? null,
      stream: row.student.studentProfile?.stream ?? null,
      subject: row.subject,
      percentage: row.percentage,
    })).sort((a, b) => a.percentage - b.percentage);
    const weakest = subjectPerformance.slice(0, 3);
    return {
      batch,
      overview: { studentCount: new Set(rows.map((row) => row.studentId)).size, resultCount: rows.length, averagePercentage: this.average(rows.map((row) => row.percentage)), belowThreshold: learnersNeedingSupport.length },
      subjectPerformance,
      learnersNeedingSupport,
      teachingActions: weakest.map((subject) => `Prioritize ${subject.subject}: average ${subject.averagePercentage}%, with ${subject.belowThreshold} learner(s) below ${this.weakThreshold}%. Use short diagnostic practice before reteaching.`),
    };
  }

  private async upsertStudyPlan(tx: Prisma.TransactionClient, input: { schoolId: number; studentId: number; batchId: number; generatedById: number; periodKey: string; results: Array<{ subject: string; percentage: number }> }) {
    const weakSubjects: WeakSubject[] = input.results.filter((row) => row.percentage < this.weakThreshold).sort((a, b) => a.percentage - b.percentage).map((row) => ({ subject: row.subject, percentage: row.percentage, priority: row.percentage < 30 ? 'HIGH' : 'MEDIUM' }));
    const focus = weakSubjects.length ? weakSubjects : input.results.slice().sort((a, b) => a.percentage - b.percentage).slice(0, 2).map((row) => ({ ...row, priority: 'MEDIUM' as const }));
    const schedule = [
      { day: 'Monday', startTime: '18:30', durationMinutes: 45 },
      { day: 'Tuesday', startTime: '18:30', durationMinutes: 45 },
      { day: 'Wednesday', startTime: '18:30', durationMinutes: 45 },
      { day: 'Thursday', startTime: '18:30', durationMinutes: 45 },
      { day: 'Friday', startTime: '18:00', durationMinutes: 45 },
      { day: 'Saturday', startTime: '10:00', durationMinutes: 60 },
    ];
    const techniques = ['Active recall', 'Worked examples', 'Spaced practice', 'Error correction'];
    const timetable = schedule.map((slot, index) => {
      const subject = focus[index % focus.length]?.subject ?? 'General revision';
      return {
        ...slot,
        subject,
        breakMinutes: index === 5 ? 15 : 10,
        learningTechnique: techniques[index % techniques.length],
        topic: `${subject} review`,
        subtopic: 'Recommended practice',
        activity: index % 2 === 0 ? 'Concept review and worked examples' : 'Targeted practice questions',
      };
    });
    const recommendations = focus.map((subject) => ({ subject: subject.subject, currentPercentage: subject.percentage, action: subject.priority === 'HIGH' ? 'Begin with foundational concepts and teacher-guided examples.' : 'Use short topic practice and review every incorrect answer.', weeklySessions: subject.priority === 'HIGH' ? 3 : 2 }));
    await tx.studentStudyPlan.upsert({
      where: { studentId_periodKey: { studentId: input.studentId, periodKey: input.periodKey } },
      update: { generatedFromBatchId: input.batchId, generatedById: input.generatedById, weakSubjects: weakSubjects as unknown as Prisma.InputJsonValue, timetable: timetable as unknown as Prisma.InputJsonValue, recommendations: recommendations as unknown as Prisma.InputJsonValue },
      create: { schoolId: input.schoolId, studentId: input.studentId, generatedFromBatchId: input.batchId, generatedById: input.generatedById, periodKey: input.periodKey, weakSubjects: weakSubjects as unknown as Prisma.InputJsonValue, timetable: timetable as unknown as Prisma.InputJsonValue, recommendations: recommendations as unknown as Prisma.InputJsonValue },
    });
  }

  private normalizeHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  private average(values: number[]) { return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0; }
  private jsonArray<T>(value: Prisma.JsonValue): T[] { return Array.isArray(value) ? value as T[] : []; }
}
