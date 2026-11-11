import { Injectable } from "@nestjs/common";
import { StudentScopeService } from "./student-scope.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
@Injectable()
export class StudentAssignmentsService {
  constructor(private readonly scopes: StudentScopeService) {}
  async getStudentSubjects(student_id: number, school_id?: number) {
    const scope = await this.scopes.getStudentScope(student_id, school_id);
    return scope.assignment_subjects ?? scope.subjects;
  }
  async findAll(actor: AuthenticatedUser) {
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    const [modules, learner] = await Promise.all([
      this.scopes.modules(scope, "ASSIGNMENT"),
      this.scopes.prisma.user.findFirst({
        where: { id: actor.id, schoolId: actor.schoolId },
        select: { weakSubjects: true },
      }),
    ]);
    if (!modules.length) return [];
    const labels = [scope.stream, scope.className].filter(
      (x): x is string => !!x,
    );
    const [assigned, mastery] = await Promise.all([
      this.scopes.prisma.assignment.findMany({
      where: {
        schoolId: actor.schoolId,
        grade: `Grade ${scope.grade}`,
        isPublished: true,
        AND: [
          { OR: [{ targetStream: null }, { targetStream: { in: labels } }] },
          { OR: [{ targetClass: null }, { targetClass: { in: labels } }] },
        ],
        OR: modules.map((m) => ({
          rawJson: { path: ["cms_module_id"], equals: m.id },
        })),
      },
      select: {
        id: true,
        dueDate: true,
        rawJson: true,
        submissions: {
          where: { studentId: actor.id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, resultsReleasedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      }),
      this.scopes.prisma.studentMasteryProgress.findMany({
        where: { studentId: actor.id, moduleId: { in: modules.map((m) => m.id) } },
      }),
    ]);
    const weakSubjects = new Set(
      (learner?.weakSubjects ?? []).map((subject) =>
        subject.trim().toLowerCase(),
      ),
    );
    return modules
      .map((m) => {
        const candidates = assigned.filter(
          (a) => (a.rawJson as any)?.cms_module_id === m.id,
        );
        const a =
          candidates.find(
            (candidate) =>
              (candidate.rawJson as any)?.cms_student_id === actor.id,
          ) ?? candidates.find((candidate) => !(candidate.rawJson as any)?.cms_student_id);
        const progress = a?.submissions[0];
        const masteryRecord = mastery.find((row) => row.moduleId === m.id);
        const priorityFocus = weakSubjects.has(m.subject.trim().toLowerCase());
        return {
          ...m,
          assignment_id: a?.id ?? null,
          due_date: a?.dueDate ?? null,
          results_released: !!progress?.resultsReleasedAt,
          state: progress
            ? progress.status === "DRAFT"
              ? "IN_PROGRESS"
              : "COMPLETED"
            : "TO_START",
          priority_focus: priorityFocus,
          mastery: masteryRecord
            ? {
                attempt_count: masteryRecord.attemptCount,
                best_score: masteryRecord.bestScore,
                mastery_status: masteryRecord.masteryStatus,
                answers_unlocked:
                  masteryRecord.masteryStatus === "MASTERED" ||
                  masteryRecord.masteryStatus === "REMEDIAL",
                attempts_remaining: Math.max(0, 3 - masteryRecord.attemptCount),
                foundation_recommended:
                  masteryRecord.masteryStatus === "REMEDIAL",
              }
            : null,
        };
      })
      .sort(
        (left, right) =>
          Number(right.priority_focus) - Number(left.priority_focus) ||
          String(left.subject).localeCompare(String(right.subject)) ||
          String(left.topic).localeCompare(String(right.topic)),
      );
  }
}
