import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  StudentScope,
  key,
  gradeNumber,
  pathwayKey,
  trackKey,
  subjectKey,
  SHARED_SUBJECTS,
  contentMatches,
  labContent,
  skillContent,
} from "./student-scope.policy";
@Injectable()
export class StudentScopeService {
  constructor(private readonly db: PrismaService) {}
  async getStudentScope(
    student_id: number,
    school_id?: number,
  ): Promise<StudentScope> {
    const user = await this.db.user.findFirst({
      where: {
        id: student_id,
        ...(school_id ? { schoolId: school_id } : {}),
        role: "STUDENT",
        isActive: true,
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
    });
    const grade = gradeNumber(user?.grade);
    if (!user || !grade)
      throw new ForbiddenException(
        "Set your current grade before opening learning content.",
      );
    const selection = user.pathwaySelections[0];
    const pathway =
      grade >= 10
        ? ((user.studentProfile?.pathway?.trim() ||
            selection?.track.pathway.name) ??
          null)
        : null;
    const track =
      grade >= 10 &&
      selection &&
      pathwayKey(selection.track.pathway.name) === pathwayKey(pathway)
        ? selection.track.name
        : null;
    const rows = await this.db.curriculumTaxonomy.findMany({
      where: { grade },
      select: { subject: true, pathway: true, track: true },
    });
    if (grade <= 9) {
      const official = await this.db.curriculumScope.findMany({
        where: { grade: `Grade ${grade}`, verified: true },
        select: { subject: true },
      });
      rows.push(...official.map((r) => ({ ...r, pathway: null, track: null })));
    }
    const shared = SHARED_SUBJECTS.filter(
      (s) =>
        grade >= 10 ||
        !["Community Service Learning", "Physical Education"].includes(s),
    );
    const subjects = [
      ...new Set([
        ...shared,
        ...rows
          .filter(
            (r) =>
              key(track) !== "businessstudies" ||
              subjectKey(r.subject) === "businessstudies" ||
              SHARED_SUBJECTS.some(
                (s) => subjectKey(s) === subjectKey(r.subject),
              ),
          )
          .filter(
            (r) =>
              grade <= 9 ||
              SHARED_SUBJECTS.some(
                (s) => subjectKey(s) === subjectKey(r.subject),
              ) ||
              ((!r.pathway ||
                (pathway && pathwayKey(r.pathway) === pathwayKey(pathway))) &&
                (!r.track || (track && trackKey(r.track) === trackKey(track)))),
          )
          .map((r) => r.subject),
        ...(grade >= 10 &&
        pathwayKey(pathway) === "stem" &&
        trackKey(track) === "technicalandengineering"
          ? ["Physics"]
          : []),
      ]),
    ];
    return {
      student_id: user.id,
      school_id: user.schoolId,
      grade,
      pathway,
      track,
      stream: user.studentProfile?.stream ?? null,
      className: user.studentProfile?.className ?? null,
      subjects,
    };
  }
  async filterAssignments(scope: StudentScope, rows: any[]) {
    const ids = [
      ...new Set(
        rows
          .map((a) => a.rawJson?.cms_module_id)
          .filter((x): x is string => typeof x === "string"),
      ),
    ];
    const modules = ids.length
      ? await this.db.masterModule.findMany({
          where: { id: { in: ids } },
          include: { assignments: { select: { stream_id: true } } },
        })
      : [];
    const allowed = new Set(
      modules
        .filter((m) => this.publishedModuleMatches(scope, m))
        .map((m) => m.id),
    );
    return rows.filter(
      (a) =>
        contentMatches(scope, {
          ...a,
          pathway: a.rawJson?.pathway ?? null,
          track: a.rawJson?.track ?? null,
        }) &&
        (!a.rawJson?.cms_module_id || allowed.has(a.rawJson.cms_module_id)),
    );
  }
  private publishedModuleMatches(scope: StudentScope, m: any) {
    if (!contentMatches(scope, m)) return false;
    if (m.status === "PUBLISHED_STORE") return m.tenant_id === null;
    return (
      m.status === "PUBLISHED_SCHOOL" &&
      m.tenant_id === String(scope.school_id) &&
      (!m.assignments.length ||
        m.assignments.some((a: any) =>
          [scope.stream, scope.className].includes(a.stream_id),
        ))
    );
  }
  async available(scope: StudentScope) {
    const [labs, skills] = await Promise.all([
      this.db.lab.findMany({
        where: {
          grade: `Grade ${scope.grade}`,
          isPublished: true,
          status: "PUBLISHED",
        },
        select: {
          id: true,
          grade: true,
          subject: true,
          pathway: true,
          categoryId: true,
          stemSubjectId: true,
          key: true,
        },
      }),
      this.db.skillCourse.findMany({
        where: {
          status: "PUBLISHED",
          category: { status: "PUBLISHED" },
          provider: { status: "PUBLISHED" },
        },
        select: {
          id: true,
          title: true,
          courseStructure: true,
          fullDescription: true,
          categoryId: true,
          providerId: true,
          provider: { select: { name: true, verified: true } },
        },
      }),
    ]);
    return {
      labs: labs.filter((x) => contentMatches(scope, labContent(x))),
      skills: skills.filter((x) =>
        contentMatches(scope, skillContent(x, scope)),
      ),
    };
  }
  async moduleAllowed(scope: StudentScope, id: string) {
    const m = await this.db.masterModule.findUnique({
      where: { id },
      include: { assignments: { select: { stream_id: true } } },
    });
    return !!m && this.publishedModuleMatches(scope, m);
  }

  async modules(scope: StudentScope, kind?: string) {
    const labels = [scope.stream, scope.className].filter(
      (x): x is string => !!x,
    );
    const rows = await this.db.masterModule.findMany({
      where: {
        grade: scope.grade,
        OR: [
          { status: "PUBLISHED_STORE", tenant_id: null },
          {
            status: "PUBLISHED_SCHOOL",
            tenant_id: String(scope.school_id),
            OR: [
              { assignments: { none: {} } },
              { assignments: { some: { stream_id: { in: labels } } } },
            ],
          },
        ],
      },
      orderBy: { updated_at: "desc" },
    });
    // Match existing CMS subscription rules, without changing CMS authoring.
    const school = await this.db.school.findUnique({
      where: { id: scope.school_id },
      select: { subscriptionStatus: true },
    });
    if (school?.subscriptionStatus !== "ACTIVE") return [];
    return rows
      .filter((m) => contentMatches(scope, m))
      .filter(
        (m) =>
          !kind ||
          ((m.content_json as any)?.content_type ?? "ASSIGNMENT") === kind,
      )
      .map((m) => ({
        id: m.id,
        grade: m.grade,
        pathway: m.pathway,
        track: m.track,
        subject: m.subject,
        topic: m.topic,
        status: m.status,
        content_type: (m.content_json as any)?.content_type ?? "ASSIGNMENT",
        question_count: Array.isArray((m.content_json as any)?.questions)
          ? (m.content_json as any).questions.length
          : 0,
      }));
  }
  get prisma() {
    return this.db;
  }
}
