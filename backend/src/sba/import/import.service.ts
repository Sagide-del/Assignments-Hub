import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import { Role } from "../../common/enums/role.enum";
import { SbaService } from "../sba.service";
import { csvCell } from "../calculations";
import { ImportMocksDto } from "./import.dto";
import { HEADERS, parseFile } from "./file-parser";
const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const core = new Set([
  "english",
  "kiswahili",
  "mathematics",
  "core mathematics",
  "essential mathematics",
  "physical education",
  "community service learning",
  "life skills",
]);
@Injectable()
export class SbaImportService {
  constructor(
    private readonly db: PrismaService,
    private readonly sba: SbaService,
  ) {}
  private school(actor: AuthenticatedUser) {
    if (
      actor.role !== Role.SCHOOL_ADMIN ||
      !Number.isInteger(actor.schoolId) ||
      actor.schoolId <= 0
    )
      throw new ForbiddenException(
        "Only your school administrator can import or merge mock results.",
      );
    return actor.schoolId;
  }
  private students(schoolId: number) {
    return this.db.user.findMany({
      where: {
        schoolId,
        role: "STUDENT",
        grade: { in: ["Grade 10", "Grade 11", "Grade 12"] },
      },
      include: {
        studentProfile: true,
        pathwaySelections: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { track: { include: { pathway: true } } },
        },
      },
      orderBy: { admissionNumber: "asc" },
    });
  }
  async template(actor: AuthenticatedUser) {
    const students = await this.students(this.school(actor));
    return (
      "\uFEFF" +
      [
        HEADERS,
        ...students
          .filter((s) => s.admissionNumber)
          .map((s) => [
            s.admissionNumber,
            s.name,
            "",
            s.grade!.replace("Grade ", ""),
            "",
            "",
          ]),
      ]
        .map((r) => r.map(csvCell).join(","))
        .join("\r\n") +
      "\r\n"
    );
  }
  async upload(
    file: Express.Multer.File,
    dto: ImportMocksDto,
    actor: AuthenticatedUser,
  ) {
    const schoolId = this.school(actor),
      rows = await parseFile(file);
    if (!rows.length) throw new BadRequestException("No result rows found.");
    const [students, taxonomy] = await Promise.all([
      this.students(schoolId),
      this.db.curriculumTaxonomy.findMany({
        where: { grade: { in: [10, 11, 12] } },
      }),
    ]);
    const byAdmission = new Map<string, typeof students>();
    for (const s of students) {
      const key = norm(s.admissionNumber ?? "");
      byAdmission.set(key, [...(byAdmission.get(key) ?? []), s]);
    }
    const errors: { row: number; admission_number: string; message: string }[] =
        [],
      valid: {
        row: number;
        student_id: number;
        subject: string;
        grade_level: number;
        term: string;
        score: number;
      }[] = [],
      seen = new Set<string>();
    for (const { row, values } of rows) {
      const [admission, name, subject, grade, term, score] = values.map((v) =>
        v.trim(),
      );
      const fail = (message: string) =>
        errors.push({ row, admission_number: admission ?? "", message });
      if (values.length !== 6) {
        fail("Expected six columns.");
        continue;
      }
      // An untouched template row is not a zero mark.
      if (!subject && !term && !score) continue;
      const matches = byAdmission.get(norm(admission)) ?? [];
      if (matches.length !== 1) {
        fail(
          "Admission number not found uniquely in your school senior-school roster.",
        );
        continue;
      }
      const student = matches[0],
        g = Number(grade.replace(/^Grade\s+/i, "")),
        value = Number(score);
      if (name && norm(name) !== norm(student.name)) {
        fail("Student name does not match this admission number.");
        continue;
      }
      if (
        ![10, 11, 12].includes(g) ||
        g > Number(student.grade!.replace("Grade ", ""))
      ) {
        fail(
          "Grade must be 10–12 and cannot exceed the learner’s current grade.",
        );
        continue;
      }
      if (!["Term 1", "Term 2", "Term 3"].includes(term)) {
        fail("Term must be Term 1, Term 2 or Term 3.");
        continue;
      }
      if (
        !/^\d+(\.\d{1,2})?$/.test(score) ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100
      ) {
        fail("Score must be a number from 0 to 100 (up to two decimals).");
        continue;
      }
      const pathway =
        student.pathwaySelections[0]?.track.pathway.name ??
        student.studentProfile?.pathway;
      const candidates = taxonomy.filter(
        (t) => t.grade === g && norm(t.subject) === norm(subject),
      );
      const match = candidates.find(
        (t) =>
          core.has(norm(t.subject)) ||
          !t.pathway ||
          (!!pathway && norm(t.pathway) === norm(pathway)),
      );
      if (!match) {
        fail(
          "Subject is not in the grade curriculum for this learner’s pathway. Check their pathway and curriculum setup.",
        );
        continue;
      }
      const key = [student.id, norm(match.subject), g, term].join("|");
      if (seen.has(key)) {
        fail("Duplicate learner/subject/grade/term in this file.");
        continue;
      }
      seen.add(key);
      valid.push({
        row,
        student_id: student.id,
        subject: match.subject,
        grade_level: g,
        term,
        score: value,
      });
    }
    const result = await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM schools WHERE id=${schoolId} FOR UPDATE`;
        let inserted = 0,
          updated = 0,
          unchanged = 0;
        for (const r of valid) {
          const { row, ...data } = r;
          const prior = await tx.externalMock_Record.findUnique({
            where: {
              student_id_subject_grade_level_term_academic_year_source: {
                student_id: r.student_id,
                subject: r.subject,
                grade_level: r.grade_level,
                term: r.term,
                academic_year: dto.academic_year,
                source: dto.source,
              },
            },
          });
          if (prior?.score === r.score) {
            unchanged++;
            continue;
          }
          const saved = prior
            ? await tx.externalMock_Record.update({
                where: { id: prior.id },
                data: { score: r.score, imported_by: actor.id },
              })
            : await tx.externalMock_Record.create({
                data: {
                  ...data,
                  school_id: schoolId,
                  academic_year: dto.academic_year,
                  source: dto.source,
                  imported_by: actor.id,
                },
              });
          if (prior) updated++;
          else inserted++;
          await tx.auditLog.create({
            data: {
              schoolId,
              userId: actor.id,
              action: "sba.external_mock.imported",
              resource: `ExternalMock_Record:${saved.id}`,
              metadata: {
                row,
                previousScore: prior?.score ?? null,
                score: r.score,
                source: dto.source,
                academicYear: dto.academic_year,
              },
            },
          });
        }
        const merge = valid.length
          ? await this.sba.persistProjections(schoolId, actor, tx)
          : null;
        return { inserted, updated, unchanged, merge };
      },
      { timeout: 60000 },
    );
    return {
      total_rows: rows.length,
      imported: valid.length,
      failed: errors.length,
      skipped: rows.length - valid.length - errors.length,
      errors,
      ...result,
    };
  }
  async merge(actor: AuthenticatedUser) {
    const schoolId = this.school(actor);
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM schools WHERE id=${schoolId} FOR UPDATE`;
        return this.sba.persistProjections(schoolId, actor, tx);
      },
      { timeout: 60000 },
    );
  }
}
