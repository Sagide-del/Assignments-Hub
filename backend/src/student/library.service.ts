import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StudentScopeService } from "./student-scope.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { validateTheoryCheatsheet } from "../cms/theory-cheatsheet";
@Injectable()
export class LibraryService {
  constructor(private readonly scopes: StudentScopeService) {}
  private sheet(value: unknown) {
    try {
      return validateTheoryCheatsheet(value);
    } catch {
      return null;
    }
  }
  async catalogue(actor: AuthenticatedUser) {
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    const modules = await this.scopes.modules(scope);
    const sheets = modules.length
      ? await this.scopes.prisma.masterModule.findMany({
          where: { id: { in: modules.map((m) => m.id) } },
          select: { id: true, theory_cheatsheet: true },
        })
      : [];
    const byId = new Map(
      sheets.map((m) => [m.id, this.sheet(m.theory_cheatsheet)]),
    );
    const subjects = new Map<
      string,
      { subject: string; topics: { topic: string; modules: any[] }[] }
    >();
    for (const module of modules) {
      const key = module.subject.trim().toLowerCase();
      if (!subjects.has(key))
        subjects.set(key, { subject: module.subject, topics: [] });
      const group = subjects.get(key)!;
      let topic = group.topics.find(
        (t) =>
          t.topic.trim().toLowerCase() === module.topic.trim().toLowerCase(),
      );
      if (!topic) {
        topic = { topic: module.topic, modules: [] };
        group.topics.push(topic);
      }
      const sheet = byId.get(module.id);
      topic.modules.push({
        ...module,
        has_cheatsheet: !!sheet,
        concept_diagram: sheet?.concept_diagram ?? null,
        has_lab: module.content_type === "LAB_3D",
      });
    }
    return {
      subjects: [...subjects.values()]
        .sort((a, b) => a.subject.localeCompare(b.subject))
        .map((s) => ({
          ...s,
          topics: s.topics
            .sort((a, b) => a.topic.localeCompare(b.topic))
            .map((t) => ({
              ...t,
              modules: t.modules.sort(
                (a, b) => a.batch_number - b.batch_number,
              ),
            })),
        })),
    };
  }
  async detail(id: string, actor: AuthenticatedUser) {
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    const eligible = await this.scopes.modules(scope);
    const module = eligible.find((m) => m.id === id);
    if (!module)
      throw new ForbiddenException(
        "This module is not available in your library.",
      );
    const stored = await this.scopes.prisma.masterModule.findUnique({
      where: { id },
      select: { theory_cheatsheet: true },
    });
    if (!stored) throw new NotFoundException("Module not found.");
    return {
      ...module,
      theory_cheatsheet: this.sheet(stored.theory_cheatsheet),
    };
  }
}
