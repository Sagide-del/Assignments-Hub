import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { from, mergeMap } from "rxjs";
import { StudentScopeService } from "./student-scope.service";
import {
  allowedSubject,
  contentMatches,
  labContent,
  skillContent,
  StudentScope,
} from "./student-scope.policy";
@Injectable()
export class StudentCurriculumInterceptor implements NestInterceptor {
  constructor(private readonly scopes: StudentScopeService) {}
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest(),
      info = req.studentContentScope;
    if (req.user?.role !== "STUDENT" || !info) return next.handle();
    ctx
      .switchToHttp()
      .getResponse()
      .setHeader("Cache-Control", "private, no-store");
    return next
      .handle()
      .pipe(mergeMap((data) => from(this.filter(data, info.kind, info.scope))));
  }
  async filter(data: any, kind: string, s: StudentScope) {
    if (kind === "practiceCatalog" && data && !Array.isArray(data))
      return {
        ...data,
        subjects: (data.subjects ?? []).filter((x: any) =>
          allowedSubject(s, x.subject),
        ),
        active: (data.active ?? []).filter((x: any) =>
          contentMatches(s, { subject: x.subject, grade: x.coverage?.grade }),
        ),
        completed: (data.completed ?? []).filter((x: any) =>
          contentMatches(s, { subject: x.subject, grade: x.coverage?.grade }),
        ),
      };
    if (!Array.isArray(data)) return data;
    const match = (r: any) => contentMatches(s, r);
    switch (kind) {
      case "submissions": {
        const allowed = new Set(
          (
            await this.scopes.filterAssignments(
              s,
              data.map((x) => x.assignment).filter(Boolean),
            )
          ).map((x) => x.id),
        );
        return data.filter((x) => allowed.has(x.assignment?.id));
      }
      case "assignments":
        return this.scopes.filterAssignments(s, data);
      case "resources":
      case "cards":
        return data.filter(match);
      case "labs":
        return data.filter((x) => match(labContent(x)));
      case "skills":
        return data.filter((x) => match(skillContent(x, s)));
      case "enrollments":
        return data.filter((x) => x.course && match(skillContent(x.course, s)));
      case "purchases":
        return data.filter((x) => x.resource && match(x.resource));
      case "mockSubjects":
      case "coach":
        return data.filter(
          (x) => allowedSubject(s, x.subject) && (!x.grade || match(x)),
        );
      case "mocks":
        return data.filter((x) =>
          match({ subject: x.subject, grade: x.coverage?.grade }),
        );
      case "modules": {
        const rows = await this.scopes.prisma.masterModule.findMany({
          where: { id: { in: data.map((x) => x.id) }, grade: s.grade },
          select: {
            id: true,
            grade: true,
            pathway: true,
            track: true,
            subject: true,
          },
        });
        const allowed = new Set(rows.filter(match).map((x) => x.id));
        return data.filter((x) => allowed.has(x.id));
      }
      case "labSessions": {
        const { labs } = await this.scopes.available(s),
          keys = new Set(labs.map((x) => x.key));
        return data.filter((x) => keys.has(x.labKey));
      }
      case "skillCategories":
      case "skillProviders":
      case "stemCategories":
      case "stemSubjects": {
        const { labs, skills } = await this.scopes.available(s);
        if (kind === "stemCategories")
          return data
            .map((x) => ({
              ...x,
              subjects: (x.subjects ?? []).filter((q: any) =>
                labs.some(
                  (l) => l.stemSubjectId === q.id || allowedSubject(s, q.name),
                ),
              ),
              _count: {
                labs: labs.filter((l) => l.categoryId === x.id).length,
              },
            }))
            .filter((x) => x._count.labs > 0);
        if (kind === "stemSubjects")
          return data
            .filter((x) => allowedSubject(s, x.name))
            .map((x) => ({
              ...x,
              _count: {
                labs: labs.filter(
                  (l) => l.stemSubjectId === x.id || l.subject === x.name,
                ).length,
              },
            }))
            .filter((x) => x._count.labs > 0);
        const field = kind === "skillCategories" ? "categoryId" : "providerId";
        return data
          .map((x) => ({
            ...x,
            _count: { courses: skills.filter((c) => c[field] === x.id).length },
          }))
          .filter((x) => x._count.courses > 0);
      }
      default:
        return data;
    }
  }
}
