import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StudentScopeService } from "./student-scope.service";
import { labConfigFor } from "./lab-config.policy";
@Injectable()
export class StudentLabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: StudentScopeService,
  ) {}
  async getLabConfig(studentId: number, schoolId: number) {
    return labConfigFor(await this.scopes.getStudentScope(studentId, schoolId));
  }
  async getLabsForStudent(studentId: number, schoolId: number) {
    const scope = await this.scopes.getStudentScope(studentId, schoolId);
    const config = labConfigFor(scope);
    if (!config.category)
      return scope.grade >= 7 && scope.grade <= 9
        ? this.scopes.modules(scope, "LAB_3D")
        : [];
    // Reuse grade, subject, subscription and school/stream distribution checks.
    const [eligible, categorized] = await Promise.all([
      this.scopes.modules(scope, "LAB_3D"),
      this.prisma.masterModule.findMany({
        where: {
          grade: scope.grade,
          status: "APPROVED",
          lab_category: config.category,
        },
        select: { id: true },
      }),
    ]);
    const ids = new Set(categorized.map((m) => m.id));
    return eligible.filter((m) => ids.has(m.id));
  }
}
