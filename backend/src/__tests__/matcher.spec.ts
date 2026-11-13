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
      findMany: jest.fn().mockResolvedValue([
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
      findFirst: jest.fn().mockResolvedValue({
        extractedScores: [{ subject: "Integrated Science", percentage: 20 }],
      }),
    },
    student_KJSEA_Result: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(async ({ create }) => ({
        ...create,
        updated_at: new Date(),
      })),
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

describe("stored KJSEA results", () => {
  test("preserves bands, missing data and numeric zero without conversions", async () => {
    const p = fixture();
    p.student_KJSEA_Result.findUnique.mockResolvedValue({
      scores_json: [
        { subject: "Integrated Science", performance_level: "EE1" },
        { subject: "Mathematics", percentage: 0 },
      ],
    });
    const r = await new MatcherService(p as any).recommend(actor, {});
    expect(r.score_source).toBe("saved_kjsea");
    expect(r.matches[0].preparation.average).toBeNull();
    expect(r.matches[0].preparation.indicators[0]).toMatchObject({
      percentage: null,
      performance_level: "EE1",
      gap: null,
    });
    expect(r.scores.find((s) => s.subject === "Mathematics")?.percentage).toBe(
      0,
    );
  });
  test("writes only actor-owned self-reported results and rejects dual representations", async () => {
    const p = fixture(),
      s = new MatcherService(p as any);
    await s.saveResults(actor, {
      results: [{ subject: "Mathematics", performance_level: "ME" }],
    });
    expect(p.student_KJSEA_Result.upsert.mock.calls[0][0]).toMatchObject({
      where: { student_id: 10 },
      create: {
        student_id: 10,
        school_id: 2,
        source: "SELF_REPORTED",
        scores_json: [{ subject: "Mathematics", performance_level: "ME" }],
      },
    });
    await expect(
      s.saveResults(actor, {
        results: [
          { subject: "Mathematics", percentage: 75, performance_level: "ME" },
        ],
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      new MatcherService(fixture("Grade 9", 99) as any).results(actor),
    ).rejects.toMatchObject({ status: 403 });
  });
  test("understands legacy dictionary-shaped grade JSON but never invents percentages", () => {
    const rows = new MatcherService(fixture() as any).cleanResults({
      Mathematics: "EE",
      English: 70,
      Physics: "invented",
    });
    expect(rows).toEqual([
      { subject: "Mathematics", performance_level: "EE" },
      { subject: "English", percentage: 70 },
    ]);
  });
});

import suppliedCombinations from "../career/data/owner-supplied-combinations-20261113.json";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { pathwayKey, relatedTrackNames } from "../career/matcher.engine";
test("owner-confirmed portal copy contains 60 unique three-subject records across the supplied tracks", () => {
  expect(suppliedCombinations).toHaveLength(60);
  expect(new Set(suppliedCombinations.map((c) => c.code)).size).toBe(60);
  expect(
    suppliedCombinations.filter((c) => c.track === "Applied Sciences"),
  ).toHaveLength(20);
  expect(
    suppliedCombinations.filter((c) => c.track === "Languages & Literature"),
  ).toHaveLength(20);
  expect(suppliedCombinations.filter((c) => c.track === "Arts")).toHaveLength(
    20,
  );
  for (const row of suppliedCombinations)
    expect(new Set(row.subjects).size).toBe(3);
  expect(pathwayKey("Arts & Sports Science")).toBe(pathwayKey("Arts & Sports"));
  expect(relatedTrackNames("Languages & Literature")).toContain("languages");
  const arts = preparation(
    ["Fine Arts", "Music & Dance"],
    [{ subject: "Creative Arts", performance_level: "EE" }],
    60,
  );
  expect(arts.indicators).toHaveLength(1);
  expect(arts.indicators[0].performance_level).toBe("EE");
  expect(arts.average).toBeNull();
});
const dbTest = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
dbTest(
  "data migration seeds the copy and reimport preserves reviewed records and record identity",
  async () => {
    const url = new URL(process.env.CMS_TEST_DATABASE_URL!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname))
      throw Error(
        "This migration test requires a loopback-only test database.",
      );
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.CMS_TEST_DATABASE_URL! } },
    });
    try {
      const codes = suppliedCombinations.map((c) => c.code),
        rows = await prisma.moE_Combination.findMany({
          where: { code: { in: codes } },
        });
      expect(rows).toHaveLength(60);
      const first = suppliedCombinations[0],
        original = rows.find((r) => r.code === first.code)!;
      const migration = readFileSync(
        resolve(
          __dirname,
          "../../prisma/migrations/20261113160000_supplied_combination_reference/migration.sql",
        ),
        "utf8",
      );
      const statement = migration
        .split("\n")
        .find(
          (line) =>
            line.startsWith("INSERT INTO") && line.includes(`'${first.code}'`),
        )!;
      expect(statement).toBeTruthy();
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.moE_Combination.update({
            where: { code: first.code },
            data: {
              is_verified: true,
              subjects: [
                "Reviewed subject A",
                "Reviewed subject B",
                "Reviewed subject C",
              ],
            },
          });
          await tx.$executeRawUnsafe(statement);
          expect(
            (
              await tx.moE_Combination.findUniqueOrThrow({
                where: { code: first.code },
              })
            ).subjects,
          ).toEqual([
            "Reviewed subject A",
            "Reviewed subject B",
            "Reviewed subject C",
          ]);
          await tx.moE_Combination.update({
            where: { code: first.code },
            data: { is_verified: false },
          });
          await tx.$executeRawUnsafe(statement);
          const reimported = await tx.moE_Combination.findUniqueOrThrow({
            where: { code: first.code },
          });
          expect(reimported.id).toBe(original.id);
          expect(reimported.subjects).toEqual(first.subjects);
          expect(reimported.is_verified).toBe(true);
          throw Error("ROLLBACK_CATALOG_TEST");
        }),
      ).rejects.toThrow("ROLLBACK_CATALOG_TEST");
      expect(
        (
          await prisma.moE_Combination.findUniqueOrThrow({
            where: { code: first.code },
          })
        ).subjects,
      ).toEqual(original.subjects);
    } finally {
      await prisma.$disconnect();
    }
  },
);
