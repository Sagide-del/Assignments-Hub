import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { MatcherService } from "../career/matcher.service";
import { checkedCatalog, preparation } from "../career/matcher.engine";
import { MatchCombinationsDto } from "../career/matcher.dto";
import { MatcherController } from "../career/matcher.controller";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
const actor: any = { id: 10, schoolId: 2, role: Role.STUDENT };
// Synthetic fixture only; never seeded as official data.
const combination = {
  id: "eaf37372-651b-4cb7-8668-ad479c9c9fa2",
  code: "ST0000",
  pathway: "STEM",
  track: "Pure Sciences",
  subjects: ["Biology", "Chemistry", "Physics"],
  source_url: "https://education.go.ke/catalog",
  is_verified: true,
};
function fixture(grade = "Grade 9", schoolId = 2) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 10, schoolId, grade }),
    },
    moE_Combination: {
      findMany: jest.fn().mockResolvedValue([combination]),
      findFirst: jest.fn().mockResolvedValue(combination),
      upsert: jest.fn(),
    },
    track: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: 1,
            name: "Pure Sciences",
            pathway: { name: "STEM" },
            description: "Explore science",
            careers: [{ title: "Scientist" }],
            requiredSubjects: [{ subject: "Mathematics" }],
          },
        ]),
      findFirst: jest.fn().mockResolvedValue({ id: 1 }),
    },
    learningCoachReportCard: {
      findFirst: jest
        .fn()
        .mockResolvedValue({
          extractedScores: [{ subject: "Integrated Science", percentage: 20 }],
        }),
    },
    grade10CombinationChoice: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ student_id: 10 }),
    },
    $transaction: jest.fn(),
  };
}
describe("Grade 10 guide", () => {
  test("only actor-owned confirmed scores are used; low results do not imply official ineligibility", async () => {
    const p = fixture(),
      r = await new MatcherService(p as any).recommend(actor, {});
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].preparation.average).toBe(20);
    expect(r.matches[0].preparation.indicators).toHaveLength(1);
    expect(r.matches[0].preparation.indicators[0].gap).toBe(40);
    expect(p.learningCoachReportCard.findFirst.mock.calls[0][0].where).toEqual({
      studentId: 10,
      schoolId: 2,
      status: "ANALYZED",
    });
  });
  test("missing scores remain unknown and junior indicators are deduplicated", () => {
    const r = preparation(["Biology", "Chemistry", "Physics"], [], 60);
    expect(r.average).toBeNull();
    expect(r.indicators[0].percentage).toBeNull();
    expect(
      preparation(
        ["Biology", "Chemistry"],
        [{ subject: "Integrated Science", percentage: 65 }],
        60,
      ).indicators,
    ).toHaveLength(1);
  });
  test("other grades and schools are rejected", async () => {
    for (const p of [
      fixture("Grade 8"),
      fixture("Grade 10"),
      fixture("Grade 9", 99),
    ])
      await expect(
        new MatcherService(p as any).recommend(actor, {}),
      ).rejects.toMatchObject({ status: 403 });
  });
  test("no body studentId or impossible percentages", async () => {
    for (const raw of [
      { studentId: 11 },
      { scores: [{ subject: "Math", percentage: 101 }] },
    ])
      expect(
        (
          await validate(plainToInstance(MatchCombinationsDto, raw), {
            whitelist: true,
            forbidNonWhitelisted: true,
          })
        ).length,
      ).toBeGreaterThan(0);
  });
  test("shortlist is scoped and does not update enrolment", async () => {
    const p = fixture();
    await new MatcherService(p as any).save(actor, {
      combination_id: combination.id,
    });
    expect(p.grade10CombinationChoice.upsert.mock.calls[0][0]).toMatchObject({
      where: { student_id: 10 },
      create: {
        student_id: 10,
        school_id: 2,
        combination_id: combination.id,
        track_id: null,
      },
    });
    expect(Object.keys(p.user)).toEqual(["findUnique"]);
    await expect(
      new MatcherService(p as any).save(actor, {
        combination_id: combination.id,
        track_id: 1,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  test("no catalogue gives exploration, never invented official codes", async () => {
    const p = fixture();
    p.moE_Combination.findMany.mockResolvedValue([]);
    const r = await new MatcherService(p as any).recommend(actor, {});
    expect(r.catalog_count).toBe(0);
    expect(r.matches).toEqual([]);
    expect(r.pathways[0].name).toBe("Pure Sciences");
  });
  test("dry-run never writes, publication needs source review, duplicate subjects rejected", async () => {
    const p = fixture(),
      s = new MatcherService(p as any),
      dto: any = {
        source_url: "https://education.go.ke/catalog",
        reviewed: false,
        combinations: [combination],
      };
    expect((await s.importCatalog(dto)).dry_run).toBe(true);
    expect(p.$transaction).not.toHaveBeenCalled();
    await expect(
      s.importCatalog({ ...dto, dry_run: false }),
    ).rejects.toMatchObject({ status: 400 });
    expect(() =>
      checkedCatalog({
        ...dto,
        source_url: "https://education.go.ke.fake.example/catalog",
      }),
    ).toThrow();
    expect(() =>
      checkedCatalog({
        ...dto,
        combinations: [
          { ...combination, subjects: ["Biology", "biology", "Physics"] },
        ],
      }),
    ).toThrow();
  });
  test("import is admin-only; selection is student-only", () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, MatcherController.prototype.import),
    ).toEqual([Role.PLATFORM_ADMIN]);
    expect(
      Reflect.getMetadata(ROLES_KEY, MatcherController.prototype.save),
    ).toEqual([Role.STUDENT]);
  });
});
