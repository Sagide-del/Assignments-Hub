import "reflect-metadata";
import { Module, UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import { labConfigFor } from "../student/lab-config.policy";
import { StudentLabsService } from "../student/labs.service";
import { StudentLabsController } from "../student/labs.controller";
import { StudentScopeService } from "../student/student-scope.service";
import { PrismaService } from "../prisma/prisma.service";
import { RolesGuard } from "../common/guards/roles.guard";
const scope = {
  student_id: 10,
  school_id: 2,
  grade: 10,
  pathway: "STEM",
  track: "Pure Sciences",
  subjects: ["Physics"],
  stream: "1B",
  className: null,
};
describe("Dynamic lab router", () => {
  test.each([
    [2, null, null, "Play Lab", "play", "LOWER_PLAY"],
    [6, null, null, "Explorer Lab", "explorer", "LOWER_EXPLORER"],
    [10, "STEM", "Pure Sciences", "Pure Sciences Lab", "pure", "STEM_PURE"],
    [
      11,
      "STEM",
      "Technical & Engineering",
      "Technical Lab",
      "technical",
      "STEM_TECHNICAL",
    ],
    [
      12,
      "STEM",
      "Applied Sciences",
      "Applied Sciences Lab",
      "applied",
      "STEM_APPLIED",
    ],
    [
      10,
      "Arts & Sports Science",
      "Music",
      "Music Studio",
      "music",
      "ARTS_MUSIC",
    ],
    [
      10,
      "Arts & Sports",
      "Performing Arts",
      "Music Studio",
      "music",
      "ARTS_MUSIC",
    ],
    [
      10,
      "Arts & Sports",
      "Fine Arts",
      "Design Canvas",
      "visual",
      "ARTS_VISUAL",
    ],
    [
      10,
      "Arts & Sports Science",
      "Sports Science",
      "Sports Lab",
      "sports",
      "ARTS_SPORTS",
    ],
    [
      10,
      "Social Sciences",
      "Humanities",
      "Humanities Lab",
      "humanities",
      "SOCIAL_HUMANITIES",
    ],
    [
      10,
      "Social Sciences",
      "Languages & Literature",
      "Language Lab",
      "languages",
      "SOCIAL_LANGUAGES",
    ],
    [10, "CTS", "Culinary Arts", "Virtual Kitchen", "culinary", "CTS_CULINARY"],
    [10, "CTS", "Trades", "Skills Lab", "trades", "CTS_TRADES"],
  ])(
    "routes grade %s / %s / %s",
    (grade, pathway, track, label, slug, category) => {
      expect(
        labConfigFor({
          grade: grade as number,
          pathway: pathway as string | null,
          track: track as string | null,
        }),
      ).toEqual({
        label,
        route: `/student/labs/${slug}`,
        category,
        ...(category === "ARTS_MUSIC" ? { icon: "Music" } : {}),
      });
    },
  );
  test("junior and missing senior profiles retain honest fallback routes", () => {
    expect(labConfigFor({ ...scope, grade: 8 })).toEqual({
      label: "Junior Science Lab",
      route: "/student/labs",
      category: null,
    });
    expect(labConfigFor({ ...scope, track: null })).toEqual({
      label: "Labs",
      route: "/student/labs",
      category: null,
    });
  });
  test("uses persisted actor scope, intersects category with audience/subject eligibility, and returns metadata only", async () => {
    const scopes = {
      getStudentScope: jest.fn().mockResolvedValue(scope),
      modules: jest
        .fn()
        .mockResolvedValue([
          { id: "allowed", topic: "Waves" },
          { id: "wrong-category" },
        ]),
    };
    const db = {
      masterModule: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: "allowed" }, { id: "other-school" }]),
      },
    };
    const service = new StudentLabsService(db as any, scopes as any);
    expect(await service.getLabsForStudent(10, 2)).toEqual([
      { id: "allowed", topic: "Waves" },
    ]);
    expect(scopes.getStudentScope).toHaveBeenCalledWith(10, 2);
    expect(scopes.modules).toHaveBeenCalledWith(scope, "LAB_3D");
    expect(db.masterModule.findMany).toHaveBeenCalledWith({
      where: { grade: 10, status: "APPROVED", lab_category: "STEM_PURE" },
      select: { id: true },
    });
    scopes.getStudentScope.mockResolvedValue({ ...scope, track: null });
    expect(await service.getLabsForStudent(10, 2)).toEqual([]);
  });
  test("lab-config endpoint ignores forged student/grade parameters and rejects non-students", async () => {
    const scopes = {
      getStudentScope: jest.fn().mockResolvedValue(scope),
      modules: jest.fn().mockResolvedValue([]),
    };
    @Module({
      controllers: [StudentLabsController],
      providers: [
        RolesGuard,
        StudentLabsService,
        { provide: PrismaService, useValue: {} },
        { provide: StudentScopeService, useValue: scopes },
      ],
    })
    class TestModule {}
    const app = await NestFactory.create(TestModule, { logger: false });
    app.use((req: any, res: any, next: any) => {
      if (req.headers.authorization)
        req.user = { id: 10, schoolId: 2, role: req.headers.authorization };
      next();
    });
    app.useGlobalGuards(
      {
        canActivate: (ctx) => {
          if (!ctx.switchToHttp().getRequest().user)
            throw new UnauthorizedException();
          return true;
        },
      },
      app.get(RolesGuard, { strict: false }),
    );
    await app.listen(0, "127.0.0.1");
    try {
      const base = await app.getUrl();
      for (const [grade, pathway, track, label] of [
        [2, null, null, "Play Lab"],
        [10, "Arts & Sports Science", "Music", "Music Studio"],
        [10, "STEM", "Pure Sciences", "Pure Sciences Lab"],
      ] as const) {
        scopes.getStudentScope.mockResolvedValue({
          ...scope,
          grade,
          pathway,
          track,
        });
        const r = await fetch(
          `${base}/student/lab-config?studentId=999&grade=12`,
          { headers: { authorization: "STUDENT" } },
        );
        expect(r.status).toBe(200);
        expect((await r.json()).label).toBe(label);
      }
      expect(scopes.getStudentScope).toHaveBeenLastCalledWith(10, 2);
      expect((await fetch(`${base}/student/lab-config`)).status).toBe(401);
      expect(
        (
          await fetch(`${base}/student/lab-config`, {
            headers: { authorization: "TEACHER" },
          })
        ).status,
      ).toBe(403);
    } finally {
      await app.close();
    }
  });
});
const realDb = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
realDb(
  "dynamic lab category migration is queryable in PostgreSQL",
  async () => {
    const url = process.env.CMS_TEST_DATABASE_URL!;
    expect(["localhost", "127.0.0.1"]).toContain(new URL(url).hostname);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await expect(
        db.masterModule.findFirst({ select: { lab_category: true } }),
      ).resolves.toBeDefined();
    } finally {
      await db.$disconnect();
    }
  },
);
