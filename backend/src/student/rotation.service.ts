import { allowedAssignmentSubject } from "./assignment-subjects";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StudentScopeService } from "./student-scope.service";
import { allowedSubject, subjectKey } from "./student-scope.policy";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { validateTheoryCheatsheet } from "../cms/theory-cheatsheet";
const topicKey = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
@Injectable()
export class RotationService {
  constructor(
    private readonly db: PrismaService,
    private readonly scopes: StudentScopeService,
  ) {}
  async nextBatch(subject: string, topic: string, actor: AuthenticatedUser) {
    if (
      !subject.trim() ||
      subject.length > 160 ||
      !topic.trim() ||
      topic.length > 240
    )
      throw new BadRequestException("Choose a subject and topic.");
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    if (!allowedAssignmentSubject(scope, subject))
      throw new ForbiddenException("This subject is outside your curriculum.");
    const catalogue = (await this.scopes.modules(scope, "ASSIGNMENT")).filter(
      (m) => subjectKey(m.subject) === subjectKey(subject),
    );
    const batches = catalogue
      .filter(
        (m) => topicKey(m.topic) === topicKey(topic) && m.question_count > 0,
      )
      .sort(
        (a, b) => a.batch_number - b.batch_number || a.id.localeCompare(b.id),
      );
    if (!batches.length)
      return {
        mastered: false,
        unavailable: true,
        module: null,
        next_topic_suggestion: null,
      };
    // Existing completed submissions are the durable progress source. Never trust client completion flags.
    const submissions = await this.db.submission.findMany({
      where: {
        studentId: actor.id,
        status: { not: "DRAFT" },
        completedAt: { not: null },
        assignment: {
          schoolId: actor.schoolId,
          OR: catalogue
            .filter((m) => m.question_count > 0)
            .map((m) => ({
              rawJson: { path: ["cms_module_id"], equals: m.id },
            })),
        },
      },
      select: { assignment: { select: { rawJson: true } } },
    });
    const completed = new Set(
      submissions.map((s) => (s.assignment.rawJson as any)?.cms_module_id),
    );
    const next = batches.find((m) => !completed.has(m.id));
    if (!next) {
      const suggestion =
        catalogue
          .filter(
            (m) =>
              topicKey(m.topic) !== topicKey(topic) &&
              m.question_count > 0 &&
              !completed.has(m.id),
          )
          .sort((a, b) => a.topic.localeCompare(b.topic))[0]?.topic ?? null;
      return {
        mastered: true,
        completed_batches: batches.length,
        total_batches: batches.length,
        next_topic_suggestion: suggestion,
      };
    }
    if (!(await this.scopes.moduleAllowed(scope, next.id)))
      throw new ForbiddenException(
        "This batch is no longer published to your account.",
      );
    const stored = await this.db.masterModule.findUnique({
      where: { id: next.id },
      select: { theory_cheatsheet: true },
    });
    let sheet = null;
    try {
      sheet = validateTheoryCheatsheet(stored?.theory_cheatsheet);
    } catch {
      /* Historical paragraph modules have no structured sheet. */
    }
    return {
      mastered: false,
      completed_batches: batches.filter((m) => completed.has(m.id)).length,
      total_batches: batches.length,
      module: { ...next, theory_cheatsheet: sheet },
      next_topic_suggestion: null,
    };
  }
}
