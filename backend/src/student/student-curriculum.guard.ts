import { allowedAssignmentSubject } from "./assignment-subjects";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { StudentScopeService } from "./student-scope.service";
import {
  allowedSubject,
  contentMatches,
  gradeNumber,
  labContent,
  skillContent,
  StudentScope,
} from "./student-scope.policy";
export function scopeRoute(c: string, h: string): string | null {
  const routes: Record<string, Record<string, string>> = {
    SubmissionsController: {
      findAll: "submissions",
      findOne: "submission",
      results: "submission",
    },
    AssignmentsController: {
      findAll: "assignments",
      findKcse: "assignments",
      findOne: "assignment",
      findQuestions: "assignment",
      listSubmissions: "assignment",
      submit: "assignment",
    },
    LabsController: { findAll: "labs", findOne: "lab" },
    LabSessionsController: { create: "labSession", findAll: "labSessions" },
    SkillsController: {
      courses: "skills",
      course: "skill",
      courseProgress: "skill",
      completeLesson: "skill",
      enroll: "skill",
      studentEnrollments: "enrollments",
      categories: "skillCategories",
      providers: "skillProviders",
    },
    ResourcesController: {
      findAll: "resources",
      findOne: "resource",
      purchase: "resource",
      download: "resource",
      myPurchases: "purchases",
    },
    CmsController: { getLearning: "modules", startLearning: "module" },
    KjseaController: {
      subjects: "mockSubjects",
      create: "mockCreate",
      list: "mocks",
      get: "mock",
      save: "mock",
      submit: "mock",
      discard: "mock",
    },
    StemController: {
      findCategories: "stemCategories",
      findSubjects: "stemSubjects",
    },
    MnemonicCardsController: { findAll: "cards" },
    PracticeController: { subjects: "practiceCatalog", start: "assignmentPracticeStart" },
    LearningCoachController: {
      catalog: "coach",
      plans: "coach",
      start: "coachStart",
      answer: "coachAnswer",
    },
    StudentContentController: {
      scope: "scope",
      assignments: "facade",
      mocks: "facade",
      skills: "facade",
      labs: "facade",
      library: "facade",
    },
    StudentLibraryController: { library: "facade" },
  };
  return routes[c]?.[h] ?? null;
}
@Injectable()
export class StudentCurriculumGuard implements CanActivate {
  constructor(private readonly scopes: StudentScopeService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role !== "STUDENT") return true;
    const kind = scopeRoute(ctx.getClass().name, ctx.getHandler().name);
    if (!kind) return true;
    const scope = await this.scopes.getStudentScope(
      req.user.id,
      req.user.schoolId,
    );
    req.studentContentScope = { scope, kind };
    // JWT claims can be stale after a grade change. Existing grade filters use this fresh value.
    req.user = { ...req.user, grade: `Grade ${scope.grade}` };
    const db = this.scopes.prisma;
    const deny = () => {
      throw new ForbiddenException(
        "This content is not part of your current grade, pathway and track.",
      );
    };
    const assert = (value: any) => {
      if (value && !contentMatches(scope, value)) deny();
    };
    const assertAssignment = async (a: any) => {
      if (a && !(await this.scopes.filterAssignments(scope, [a])).length)
        deny();
    };
    const numeric = Number(req.params.id);
    if (kind === "submission" && Number.isSafeInteger(numeric)) {
      const submission = await db.submission.findFirst({
        where: { id: numeric, studentId: scope.student_id },
        include: { assignment: true },
      });
      if (submission) await assertAssignment(submission.assignment);
    }
    if (kind === "submissions" && req.query?.assignmentId) {
      const id = Number(req.query.assignmentId);
      if (Number.isSafeInteger(id))
        await assertAssignment(
          await db.assignment.findUnique({ where: { id } }),
        );
    }
    if (kind === "assignment" && Number.isSafeInteger(numeric))
      await assertAssignment(
        await db.assignment.findUnique({ where: { id: numeric } }),
      );
    if (kind === "lab" && Number.isSafeInteger(numeric)) {
      const lab = await db.lab.findUnique({ where: { id: numeric } });
      if (lab) assert(labContent(lab));
    }
    if (kind === "labSession") {
      const lab = await db.lab.findUnique({
        where: { key: req.body?.labKey ?? "" },
      });
      if (!lab) deny();
      else assert(labContent(lab));
    }
    if (kind === "skill") {
      const id =
        kind === "skill" && ctx.getHandler().name === "enroll"
          ? Number(req.body?.courseId)
          : numeric;
      if (Number.isInteger(id)) {
        const c = await db.skillCourse.findUnique({
          where: { id },
          include: { provider: { select: { name: true, verified: true } } },
        });
        if (c) assert(skillContent(c, scope));
      }
    }
    if (kind === "resource" && Number.isSafeInteger(numeric))
      assert(await db.resourceListing.findUnique({ where: { id: numeric } }));
    if (
      kind === "module" &&
      !(await this.scopes.moduleAllowed(scope, req.params.id))
    )
      deny();
    if (kind === "mockSubjects" || kind === "mockCreate") {
      const requested =
        kind === "mockCreate" ? req.body?.grade : req.query?.grade;
      if (requested !== undefined && gradeNumber(requested) !== scope.grade)
        deny();
      if (
        kind === "mockCreate" &&
        !allowedSubject(scope, req.body?.subject ?? "Mathematics")
      )
        deny();
    }
    if (kind === "mock") {
      const m = await db.kjseaMockAttempt.findFirst({
        where: {
          id: req.params.id,
          studentId: scope.student_id,
          schoolId: scope.school_id,
        },
      });
      if (m) {if(m.source === "PRACTICE") {if(!allowedAssignmentSubject(scope,m.subject) || gradeNumber((m.coverage as any)?.grade)!==scope.grade)deny();} else assert({ grade: (m.coverage as any)?.grade, subject: m.subject });}
    }
    if (kind === "assignmentPracticeStart" && !allowedAssignmentSubject(scope,req.body?.subject)) deny();
    if (kind === "coachStart" && !allowedSubject(scope, req.body?.subject))
      deny();
    if (kind === "coachAnswer" && Number.isSafeInteger(numeric)) {
      const s = await db.learningCoachSession.findFirst({
        where: {
          id: numeric,
          studentId: scope.student_id,
          schoolId: scope.school_id,
        },
        include: { plan: true },
      });
      if (s) assert(s.plan);
    }
    return true;
  }
}
