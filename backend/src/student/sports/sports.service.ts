import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StudentLabsService } from "../labs.service";
import { StudentScopeService } from "../student-scope.service";
import { AuthenticatedUser } from "../../auth/interfaces/authenticated-user.interface";
import {
  SPORTS_IDS,
  SPORTS_LESSONS,
  SPORTS_CONTROLS,
  sportsQuestions,
  assessSports,
  SportsSubmission,
} from "./sports-engine";
@Injectable()
export class SportsLabService {
  constructor(
    private readonly db: PrismaService,
    private readonly labs: StudentLabsService,
    private readonly scopes: StudentScopeService,
  ) {}
  private async scope(a: AuthenticatedUser) {
    const s = await this.scopes.getStudentScope(a.id, a.schoolId);
    const c = await this.labs.getLabConfig(a.id, a.schoolId);
    if (c.category !== "ARTS_SPORTS" || s.grade < 10 || s.grade > 12)
      throw new ForbiddenException(
        "Sports Lab is available to learners in the Sports Science track.",
      );
    return s;
  }
  async activities(a: AuthenticatedUser) {
    const s = await this.scope(a);
    return {
      grade: s.grade,
      activities: SPORTS_IDS.map((id) => ({
        id,
        ...SPORTS_LESSONS[id],
        focus: SPORTS_LESSONS[id].focus[Math.min(2, s.grade - 10)],
        controls: SPORTS_CONTROLS[id],
        questions: sportsQuestions(id, s.grade).map(
          ({ answer, explanation, ...q }) => q,
        ),
      })),
    };
  }
  async progress(a: AuthenticatedUser) {
    await this.scope(a);
    return this.db.sports_Lab_Progress.findMany({
      where: { student_id: a.id },
      orderBy: { simulation: "asc" },
    });
  }
  async complete(p: SportsSubmission, a: AuthenticatedUser) {
    const scope = await this.scope(a);
    let result: ReturnType<typeof assessSports>;
    try {
      result = assessSports(p, scope.grade);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "Invalid investigation.",
      );
    }
    const key = {
      student_id_simulation: { student_id: a.id, simulation: p.simulation },
    };
    await this.db.$transaction([
      this.db.sports_Lab_Progress.upsert({
        where: key,
        create: { student_id: a.id, simulation: p.simulation, score: 0 },
        update: {},
      }),
      this.db.sports_Lab_Progress.updateMany({
        where: {
          student_id: a.id,
          simulation: p.simulation,
          score: { lt: result.score },
        },
        data: { score: result.score },
      }),
      ...(result.completed
        ? [
            this.db.sports_Lab_Progress.updateMany({
              where: {
                student_id: a.id,
                simulation: p.simulation,
                completed_at: null,
              },
              data: { completed_at: new Date() },
            }),
          ]
        : []),
    ]);
    return {
      ...result,
      progress: await this.db.sports_Lab_Progress.findUnique({ where: key }),
    };
  }
}
