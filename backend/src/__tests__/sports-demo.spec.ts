import { PrismaClient } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth/auth.service";
import { StudentScopeService } from "../student/student-scope.service";
import { SportsLabService } from "../student/sports/sports.service";
import demoSeed from "../student/sports/demo-seed.json";
import { StudentLabsService } from "../student/labs.service";
const {
  provisionSportsDemo,
  verifySportsDemo,
} = require("../../scripts/deployment/provision-sports-demo.cjs");
describe("Sports demo verification", () => {
  it("checks login identity, Sports Lab scope and progress and activity access without exposing a token", async () => {
    const original = global.fetch;
    const calls: any[] = [];
    global.fetch = jest.fn(async (url, options) => {
      calls.push([url, options]);
      return {
        ok: true,
        status: 200,
        json: async () =>
          String(url).endsWith("/auth/student/login")
            ? {
                user: { id: 20, role: "STUDENT" },
                accessToken: "fixture-token",
              }
            : String(url).endsWith("/student/lab-config")
              ? { category: "ARTS_SPORTS", route: "/student/labs/sports" }
              : String(url).endsWith("/student/sports-lab/activities")
                ? {
                    grade: 10,
                    activities: [
                      "skeletal",
                      "muscle",
                      "energy",
                      "respiratory",
                      "reflex",
                    ].map((id) => ({ id })),
                  }
                : [],
      } as any;
    });
    try {
      expect(
        await verifySportsDemo(
          {
            studentId: 20,
            schoolCode: "SPORTSDEMO",
            admissionNumber: "SPORTS1001",
            pin: "123456",
          },
          "https://fixture.invalid",
        ),
      ).toBe(true);
      expect(calls).toHaveLength(4);
      expect(calls[1][1].headers.Authorization).toBe("Bearer fixture-token");
    } finally {
      global.fetch = original;
    }
  });
  it("refuses an existing demo without resetting users or credentials", async () => {
    const tx = {
      $queryRaw: async () => [],
      school: { findUnique: async () => ({ id: 1 }) },
    };
    const db = { $transaction: async (fn: any) => fn(tx) };
    await expect(provisionSportsDemo(db)).rejects.toThrow("already exists");
  });
});
const real = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
real(
  "sports demo has a working hashed PIN and persisted Arts/Sports scope in PostgreSQL",
  async () => {
    const url = process.env.CMS_TEST_DATABASE_URL!;
    expect(["localhost", "127.0.0.1"]).toContain(new URL(url).hostname);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await expect(
        db.$transaction(
          async (tx) => {
            if (await tx.school.findUnique({ where: { code: "SPORTSDEMO" } }))
              throw Error("Existing SPORTSDEMO fixture; no changes permitted.");
            let pathway = await tx.pathway.findFirst({
              where: {
                name: {
                  in: [
                    "Arts & Sports",
                    "Arts & Sports Science",
                    "Arts and Sports Science",
                  ],
                },
              },
            });
            if (!pathway)
              await tx.pathway.create({
                data: {
                  key: "sports-demo-integration-arts",
                  name: "Arts & Sports",
                  description: "Integration fixture only",
                  icon: "music",
                },
              });
            const wrapped = { $transaction: async (fn: any) => fn(tx) };
            const c = await provisionSportsDemo(wrapped);
            const auth = new AuthService(
              tx as any,
              new JwtService({ secret: "local-sports-demo-fixture" }),
              { record: async () => {} } as any,
              new ConfigService(),
            );
            const login = await auth.loginStudent({
              schoolCode: c.schoolCode,
              admissionNumber: c.admissionNumber,
              pin: c.pin,
            });
            expect(login.user.id).toBe(c.studentId);
            expect(login.user.grade).toBe("Grade 10");
            const scopes = new StudentScopeService(tx as any);
            const config = await new StudentLabsService(
              tx as any,
              scopes,
            ).getLabConfig(c.studentId, c.schoolId);
            expect(config.category).toBe("ARTS_SPORTS");
            const user = await tx.user.findUniqueOrThrow({
              where: { id: c.studentId },
            });
            expect(user.passwordHash).not.toBe(c.pin);
            expect(user.subscriptionExpiresAt!.getTime()).toBeGreaterThan(
              Date.now(),
            );
            await expect(provisionSportsDemo(wrapped)).rejects.toThrow(
              "already exists",
            );
            const {
              ensureRequestedSportsDemo,
            } = require("../../scripts/deployment/ensure-requested-sports-demo.cjs");
            const beforeReady = new SportsLabService(
              tx as any,
              new StudentLabsService(tx as any, scopes),
              scopes,
            );
            expect(await beforeReady.demoReady()).toBe(false);
            await tx.user.update({
              where: { id: c.studentId },
              data: { passwordHash: demoSeed.passwordHash },
            });
            const sports = new SportsLabService(
              tx as any,
              new StudentLabsService(tx as any, scopes),
              scopes,
            );
            expect(await sports.demoReady()).toBe(true);
            const unchanged = await ensureRequestedSportsDemo({
              school: tx.school,
              user: tx.user,
            });
            expect(unchanged).toEqual({
              created: false,
              studentId: c.studentId,
            });
            expect(
              await tx.user.count({
                where: { admissionNumber: "SPORTS1001", schoolId: c.schoolId },
              }),
            ).toBe(1);
            throw Error("ROLLBACK_SPORTS_DEMO_TEST");
          },
          { timeout: 30000 },
        ),
      ).rejects.toThrow("ROLLBACK_SPORTS_DEMO_TEST");
    } finally {
      await db.$disconnect();
    }
  },
  30000,
);

describe("requested production Sports demo bootstrap", () => {
  const {
    ensureRequestedSportsDemo,
    isTargetProduction,
  } = require("../../scripts/deployment/ensure-requested-sports-demo.cjs");
  test("only targets the configured production backend", () => {
    expect(isTargetProduction({})).toBe(false);
    expect(
      isTargetProduction({
        RENDER: "true",
        RENDER_EXTERNAL_HOSTNAME: "another-service.onrender.com",
      }),
    ).toBe(false);
    expect(
      isTargetProduction({
        RENDER_EXTERNAL_HOSTNAME: "assignments-hub-api.onrender.com",
      }),
    ).toBe(true);
  });
  test("never resets a matching existing learner", async () => {
    const db = {
      school: {
        findUnique: async () => ({ id: 8, name: "Assignment Hub Sports Demo" }),
      },
      user: {
        findFirst: async () => ({
          id: 20,
          role: "STUDENT",
          name: "Sports Demo Learner",
        }),
      },
      $transaction: jest.fn(),
    };
    expect(await ensureRequestedSportsDemo(db)).toEqual({
      created: false,
      studentId: 20,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  test("refuses another record using the reserved code", async () => {
    const db = {
      school: { findUnique: async () => ({ id: 8, name: "Another school" }) },
      user: { findFirst: async () => null },
      $transaction: jest.fn(),
    };
    await expect(ensureRequestedSportsDemo(db)).rejects.toThrow("No changes");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
