import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { assertStudentScope, teacherPairs } from "../teacher-scope/scope";
import { RecordSbaDto, SbaFiltersDto } from "./sba.dto";
import {
  average,
  csvCell,
  mockPercentage,
  predictedGrade,
  projectedScore,
  round,
  SBA_WEIGHTS,
} from "./calculations";

@Injectable()
export class SbaService {
  constructor(private readonly db: PrismaService) {}
  async capabilities() {
    await Promise.all([
      this.db.sBA_Record.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.question.findFirst({
        where: { id: -1 },
        select: { illustration: true },
      }),
    ]);
    await Promise.all([
      this.db.externalMock_Record.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
      this.db.sBA_Projection.count({
        where: { id: "00000000-0000-0000-0000-000000000000" },
      }),
    ]);
    return { sbaVersion: 1, questionBlueprintVersion: 1, sbaImportVersion: 1 };
  }
  assertSchool(actor: AuthenticatedUser, schoolId: number) {
    if (
      ![Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN].includes(actor.role as any) ||
      (actor.role !== Role.PLATFORM_ADMIN && actor.schoolId !== schoolId)
    )
      throw new ForbiddenException(
        "You cannot access this school assessment report.",
      );
  }
  async record(dto: RecordSbaDto, actor: AuthenticatedUser) {
    if (actor.role !== Role.TEACHER)
      throw new ForbiddenException(
        "Only assigned teachers can enter SBA scores.",
      );
    await assertStudentScope(this.db, actor, dto.student_id, dto.subject);
    const pair = (await teacherPairs(this.db, actor)).find(
      (p) => p.subject.toLowerCase() === dto.subject.toLowerCase(),
    );
    if (!pair)
      throw new ForbiddenException("This subject is outside your assignment.");
    const year = dto.academic_year ?? new Date().getUTCFullYear();
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${dto.student_id} AND school_id=${actor.schoolId} FOR UPDATE`;
      // Re-check persisted scope inside the write transaction; never trust a client roster.
      const student = await tx.user.findFirst({
        where: {
          id: dto.student_id,
          schoolId: actor.schoolId,
          role: "STUDENT",
          grade: { in: ["Grade 10", "Grade 11", "Grade 12"] },
        },
        select: {
          id: true,
          grade: true,
          studentProfile: { select: { stream: true } },
        },
      });
      const permission =
        student &&
        (await tx.teacherAssignment.findFirst({
          where: {
            teacher_id: actor.id,
            school_id: actor.schoolId,
            subject: { equals: dto.subject, mode: "insensitive" },
            teacher: {
              role: "TEACHER",
              isActive: true,
              schoolId: actor.schoolId,
            },
            stream: {
              school_id: actor.schoolId,
              grade: student.grade!,
              name: student.studentProfile?.stream ?? "",
            },
          },
        }));
      if (
        !permission ||
        !student ||
        dto.grade_level > Number(student.grade!.split(" ")[1])
      )
        throw new ForbiddenException(
          "This learner or assessment grade is outside your assigned scope.",
        );
      const key = {
        student_id: dto.student_id,
        school_id: actor.schoolId,
        grade_level: dto.grade_level,
        academic_year: year,
        term: dto.term,
        subject: { equals: permission.subject, mode: "insensitive" as const },
      };
      const previous = await tx.sBA_Record.findFirst({ where: key });
      if (previous?.score === dto.score) return previous;
      const saved = previous
        ? await tx.sBA_Record.update({
            where: { id: previous.id },
            data: { score: dto.score, entered_by: actor.id },
          })
        : await tx.sBA_Record.create({
            data: {
              student_id: dto.student_id,
              school_id: actor.schoolId,
              subject: permission.subject,
              grade_level: dto.grade_level,
              term: dto.term,
              academic_year: year,
              score: dto.score,
              entered_by: actor.id,
            },
          });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.id,
          action: "sba.score.recorded",
          resource: `SBA_Record:${saved.id}`,
          metadata: {
            previousScore: previous?.score ?? null,
            score: dto.score,
            grade: dto.grade_level,
            term: dto.term,
            academicYear: year,
          },
        },
      });
      return saved;
    });
  }
  private studentsWhere(
    schoolId: number,
    filters: SbaFiltersDto = {},
  ): Prisma.UserWhereInput {
    return {
      schoolId,
      role: "STUDENT",
      grade: filters.grade ?? { in: ["Grade 10", "Grade 11", "Grade 12"] },
      ...(filters.stream
        ? { studentProfile: { is: { stream: filters.stream } } }
        : {}),
      AND: [
        ...(filters.pathway
          ? [
              {
                OR: [
                  {
                    studentProfile: {
                      is: {
                        pathway: {
                          equals: filters.pathway,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    pathwaySelections: {
                      some: {
                        isActive: true,
                        track: {
                          pathway: {
                            name: {
                              equals: filters.pathway,
                              mode: "insensitive" as const,
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(filters.track
          ? [
              {
                pathwaySelections: {
                  some: {
                    isActive: true,
                    track: {
                      name: {
                        equals: filters.track,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              },
            ]
          : []),
      ],
    };
  }
  private async report(
    schoolId: number,
    where: Prisma.UserWhereInput,
    subjects?: string[],
    db: Prisma.TransactionClient = this.db,
  ) {
    const subjectFilter = subjects
      ? {
          OR: subjects.map((subject) => ({
            subject: { equals: subject, mode: "insensitive" as const },
          })),
        }
      : {};
    const [students, records, attempts, external] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          grade: true,
          studentProfile: { select: { stream: true, pathway: true } },
          pathwaySelections: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              track: {
                select: { name: true, pathway: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: [{ grade: "asc" }, { name: "asc" }],
      }),
      db.sBA_Record.findMany({
        where: {
          school_id: schoolId,
          student: { is: where },
          ...subjectFilter,
        },
        orderBy: [
          { academic_year: "desc" },
          { term: "asc" },
          { subject: "asc" },
        ],
      }),
      db.kjseaMockAttempt.findMany({
        where: {
          schoolId,
          student: { is: where },
          status: "SUBMITTED",
          completedAt: { not: null },
          score: { not: null },
          source: { not: "PRACTICE" },
          ...subjectFilter,
          NOT: { questions: { array_contains: [{ manualSelfReview: true }] } },
        },
        select: {
          studentId: true,
          subject: true,
          score: true,
          source: true,
          coverage: true,
        },
      }),
      db.externalMock_Record.findMany({
        where: {
          school_id: schoolId,
          student: { is: where },
          grade_level: 12,
          ...subjectFilter,
        },
        orderBy: { academic_year: "desc" },
      }),
    ]);
    const byStudent = new Map<number, typeof records>();
    for (const record of records)
      byStudent.set(record.student_id, [
        ...(byStudent.get(record.student_id) ?? []),
        record,
      ]);
    const mockByStudent = new Map<number, number[]>();
    for (const attempt of attempts) {
      const value = mockPercentage(attempt);
      if (value !== null)
        mockByStudent.set(attempt.studentId, [
          ...(mockByStudent.get(attempt.studentId) ?? []),
          value,
        ]);
    }
    const rows = students.map((student) => {
      const history = byStudent.get(student.id) ?? [];
      function gradeAverage(grade: number) {
        const matching = history.filter((r) => r.grade_level === grade);
        const latestYear = matching.length
          ? Math.max(...matching.map((r) => r.academic_year))
          : null;
        return average(
          matching
            .filter((r) => r.academic_year === latestYear)
            .map((r) => r.score),
        );
      }
      const g10 = gradeAverage(10),
        g11 = gradeAverage(11),
        mock = average(mockByStudent.get(student.id) ?? []);
      const imported = external.filter((r) => r.student_id === student.id);
      const latestExternalYear = imported[0]?.academic_year;
      const externalAverage = average(
        imported
          .filter((r) => r.academic_year === latestExternalYear)
          .map((r) => r.score),
      );
      const best =
        mock === null
          ? externalAverage
          : externalAverage === null
            ? mock
            : Math.max(mock, externalAverage);
      const projected = projectedScore(g10, g11, best);
      const selection = student.pathwaySelections[0]?.track;
      return {
        student_id: student.id,
        name: student.name,
        admission_number: student.admissionNumber,
        grade: student.grade,
        stream: student.studentProfile?.stream ?? null,
        pathway:
          student.studentProfile?.pathway ?? selection?.pathway.name ?? null,
        track: selection?.name ?? null,
        grade10_sba: round(g10),
        grade11_sba: round(g11),
        internal_mock: round(mock),
        external_mock: round(externalAverage),
        kcbe_mock: round(best),
        projected,
        predicted_grade: predictedGrade(projected),
        evidence_components: [g10, g11, best].filter((v) => v !== null).length,
        mock_attempt_count: (mockByStudent.get(student.id) ?? []).length,
        records: history,
        external_records: imported,
      };
    });
    const complete = rows.filter((r) => r.projected !== null);
    return {
      rows,
      summary: {
        students: rows.length,
        complete: complete.length,
        average_projected: round(average(complete.map((r) => r.projected!))),
        below50: complete.filter((r) => r.projected! < 50).length,
        top_performers: complete.filter((r) => r.projected! >= 70).length,
      },
      weights: SBA_WEIGHTS,
      projection_note:
        "Internal 15/15/70 planning estimate using the higher of external and internal Grade 12 mock averages. Not an official KCBE result or KNEC submission format.",
    };
  }
  async school(
    schoolId: number,
    actor: AuthenticatedUser,
    filters: SbaFiltersDto = {},
  ) {
    this.assertSchool(actor, schoolId);
    return this.report(schoolId, this.studentsWhere(schoolId, filters));
  }
  async student(id: number, actor: AuthenticatedUser) {
    const student = await this.db.user.findUnique({
      where: { id },
      select: { schoolId: true, role: true },
    });
    if (!student || student.role !== "STUDENT")
      throw new NotFoundException("Learner not found.");
    if (actor.role === Role.TEACHER) {
      await assertStudentScope(this.db, actor, id);
      const pairs = await teacherPairs(this.db, actor);
      const learner = await this.db.user.findUniqueOrThrow({
        where: { id },
        select: { grade: true, studentProfile: { select: { stream: true } } },
      });
      const subjects = pairs
        .filter(
          (p) =>
            p.stream.grade === learner.grade &&
            p.stream.name === learner.studentProfile?.stream,
        )
        .map((p) => p.subject);
      return {
        ...(await this.report(
          student.schoolId,
          { id, schoolId: actor.schoolId, role: "STUDENT" },
          subjects,
        )),
        scope: "ASSIGNED_SUBJECTS",
      };
    }
    this.assertSchool(actor, student.schoolId);
    return this.report(student.schoolId, {
      id,
      schoolId: student.schoolId,
      role: "STUDENT",
    });
  }
  async teaching(id: string, actor: AuthenticatedUser) {
    if (actor.role !== Role.TEACHER) throw new ForbiddenException();
    const pair = (await teacherPairs(this.db, actor)).find((p) => p.id === id);
    if (!pair)
      throw new ForbiddenException("Class is outside your assignments.");
    const report = await this.report(
      actor.schoolId,
      {
        schoolId: actor.schoolId,
        role: "STUDENT",
        grade: pair.stream.grade,
        studentProfile: { is: { stream: pair.stream.name } },
      },
      [pair.subject],
    );
    return {
      ...report,
      teaching_class: {
        id: pair.id,
        subject: pair.subject,
        grade: pair.stream.grade,
        stream: pair.stream.name,
      },
    };
  }
  async persistProjections(
    schoolId: number,
    actor: AuthenticatedUser,
    db: Prisma.TransactionClient = this.db,
  ) {
    this.assertSchool(actor, schoolId);
    const report = await this.report(
      schoolId,
      this.studentsWhere(schoolId),
      undefined,
      db,
    );
    for (const r of report.rows) {
      const data = {
        school_id: schoolId,
        grade10_sba: r.grade10_sba,
        grade11_sba: r.grade11_sba,
        internal_mock: r.internal_mock,
        external_mock: r.external_mock,
        kcbe_mock_final: r.kcbe_mock,
        projected: r.projected,
        predicted_grade: r.predicted_grade,
        calculated_at: new Date(),
      };
      await db.sBA_Projection.upsert({
        where: { student_id: r.student_id },
        create: { student_id: r.student_id, ...data },
        update: data,
      });
    }
    return {
      students: report.rows.length,
      complete: report.summary.complete,
      calculated_at: new Date().toISOString(),
    };
  }
  async csv(
    schoolId: number,
    actor: AuthenticatedUser,
    filters: SbaFiltersDto,
  ) {
    const { rows } = await this.school(schoolId, actor, filters);
    const header = [
      "Admission No",
      "Name",
      "Grade",
      "Stream",
      "Grade 10 SBA %",
      "Grade 11 SBA %",
      "Internal Mock %",
      "External Mock %",
      "Best Mock %",
      "Projected Final %",
      "Predicted Grade",
    ];
    return (
      "\uFEFF" +
      [
        header,
        ...rows.map((r) => [
          r.admission_number,
          r.name,
          r.grade,
          r.stream,
          r.grade10_sba,
          r.grade11_sba,
          r.internal_mock,
          r.external_mock,
          r.kcbe_mock,
          r.projected,
          r.predicted_grade,
        ]),
      ]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n") +
      "\r\n"
    );
  }
}
