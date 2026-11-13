import { PrismaClient } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth/auth.service";
import { StudentScopeService } from "../student/student-scope.service";
import { StudentLabsService } from "../student/labs.service";
const {
  provisionMusicDemo,
  verifyMusicDemo,
} = require("../../scripts/deployment/provision-music-demo.cjs");
describe("Music demo verification", () => {
  it("checks login identity, Music Studio scope and project access without exposing a token", async () => {
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
              ? { category: "ARTS_MUSIC", route: "/student/labs/music" }
              : [],
      } as any;
    });
    try {
      expect(
        await verifyMusicDemo(
          {
            studentId: 20,
            schoolCode: "MUSICDEMO",
            admissionNumber: "MUSIC1001",
            pin: "123456",
          },
          "https://fixture.invalid",
        ),
      ).toBe(true);
      expect(calls).toHaveLength(3);
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
    await expect(provisionMusicDemo(db)).rejects.toThrow("already exists");
  });
});
const real = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
real(
  "music demo has a working hashed PIN and persisted Arts/Music scope in PostgreSQL",
  async () => {
    const url = process.env.CMS_TEST_DATABASE_URL!;
    expect(["localhost", "127.0.0.1"]).toContain(new URL(url).hostname);
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await expect(
        db.$transaction(
          async (tx) => {
            if (await tx.school.findUnique({ where: { code: "MUSICDEMO" } }))
              throw Error("Existing MUSICDEMO fixture; no changes permitted.");
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
                  key: "music-demo-integration-arts",
                  name: "Arts & Sports",
                  description: "Integration fixture only",
                  icon: "music",
                },
              });
            const wrapped = { $transaction: async (fn: any) => fn(tx) };
            const c = await provisionMusicDemo(wrapped);
            const auth = new AuthService(
              tx as any,
              new JwtService({ secret: "local-music-demo-fixture" }),
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
            expect(config.category).toBe("ARTS_MUSIC");
            const user = await tx.user.findUniqueOrThrow({
              where: { id: c.studentId },
            });
            expect(user.passwordHash).not.toBe(c.pin);
            expect(user.subscriptionExpiresAt!.getTime()).toBeGreaterThan(
              Date.now(),
            );
            await expect(provisionMusicDemo(wrapped)).rejects.toThrow(
              "already exists",
            );
            throw Error("ROLLBACK_MUSIC_DEMO_TEST");
          },
          { timeout: 30000 },
        ),
      ).rejects.toThrow("ROLLBACK_MUSIC_DEMO_TEST");
    } finally {
      await db.$disconnect();
    }
  },
  30000,
);
