import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import {
  SPORTS_IDS,
  defaultSportsConfig,
  validSportsConfig,
  sportsResult,
  sportsQuestions,
  assessSports,
  SportsSubmission,
} from "../student/sports/sports-engine";
import { SportsLabService } from "../student/sports/sports.service";
import { labConfigFor } from "../student/lab-config.policy";
const actor: any = { id: 10, schoolId: 2, role: "STUDENT" };
function submission(
  simulation: (typeof SPORTS_IDS)[number],
  grade = 10,
): SportsSubmission {
  const config = defaultSportsConfig(simulation),
    next = { ...config };
  const key = Object.keys(next)[0];
  next[key] += simulation === "reflex" ? 5 : 5;
  return {
    simulation,
    prediction:
      "Changing one condition should change the model result because it changes the input.",
    conclusion:
      "The two trials show a change in the result while the other variables were held constant.",
    observations: [
      { config, note: "The initial condition produced the recorded output." },
      {
        config: next,
        note: "Changing the condition changed the model output.",
      },
    ],
    answers: sportsQuestions(simulation, grade).map((q) => q.answer),
    inspected: ["femur", "tibia", "ribs"],
  };
}
describe("Sports Science investigations", () => {
  test("Sports track gets Sports Lab and all configurations have bounded outputs", () => {
    expect(
      labConfigFor({
        grade: 10,
        pathway: "Arts & Sports Science",
        track: "Sports Science",
      }).route,
    ).toBe("/student/labs/sports");
    for (const id of SPORTS_IDS) {
      const c = defaultSportsConfig(id);
      expect(validSportsConfig(id, c)).toBe(true);
      expect(
        sportsResult(id, c).every(
          (r) => Number.isFinite(r.value) && r.value >= 0,
        ),
      ).toBe(true);
      expect(validSportsConfig(id, { ...c, injected: 1 })).toBe(false);
      expect(
        validSportsConfig(
          id,
          Object.fromEntries(Object.keys(c).map((k) => [k, Infinity])),
        ),
      ).toBe(false);
    }
  });
  test("muscle requires calcium and ATP, with unchanged filament lengths in the illustrative model", () => {
    const resting = sportsResult("muscle", { calcium: 0, atp: 100 })[0].value,
      active = sportsResult("muscle", { calcium: 100, atp: 100 })[0].value;
    expect(resting).toBe(0);
    expect(active).toBeGreaterThan(50);
    expect(sportsResult("muscle", { calcium: 100, atp: 0 })[0].value).toBe(0);
  });
  test("energy systems overlap, normalize to 100 and change dominance", () => {
    const early = sportsResult("energy", { intensity: 100, duration: 0 }),
      middle = sportsResult("energy", { intensity: 100, duration: 30 }),
      late = sportsResult("energy", { intensity: 100, duration: 180 });
    expect(early[0].value).toBeGreaterThan(early[2].value);
    expect(middle[1].value).toBeGreaterThan(middle[0].value);
    expect(late[2].value).toBeGreaterThan(late[1].value);
    for (const rows of [early, middle, late]) {
      expect(rows.every((r) => r.value > 0)).toBe(true);
      expect(rows.reduce((sum, r) => sum + r.value, 0)).toBeCloseTo(100);
    }
  });
  test("cardiac output, oxygen delivery and uptake use their stated assumptions", () => {
    const r = sportsResult("respiratory", {
      heartRate: 100,
      strokeVolume: 80,
      extraction: 50,
    });
    expect(r.map((x) => x.value)).toEqual([8, 1600, 400]);
    expect(
      sportsResult("respiratory", {
        heartRate: 100,
        strokeVolume: 80,
        extraction: 100,
      })[2].value,
    ).toBe(800);
  });
  test("reflex timing uses distance/speed plus a stated synaptic delay", () => {
    expect(sportsResult("reflex", { speed: 60, path: 1.2 })[0].value).toBe(22);
    expect(
      sportsResult("reflex", { speed: 60, path: 2 })[0].value,
    ).toBeGreaterThan(22);
  });
  test("server derives scores and requires prediction, distinct trials and an explanation", () => {
    for (const id of SPORTS_IDS) {
      const p = submission(id);
      expect(assessSports(p, 10).score).toBe(100);
      expect(() => assessSports({ ...p, prediction: "" }, 10)).toThrow();
      expect(() =>
        assessSports(
          { ...p, observations: [p.observations[0], p.observations[0]] },
          10,
        ),
      ).toThrow();
      expect(() => assessSports({ ...p, answers: [100, 0, 1] }, 10)).toThrow();
      expect(() => assessSports({ ...p, conclusion: "done" }, 10)).toThrow();
      const wrong = { ...p, answers: p.answers.map((n) => (n + 1) % 4) };
      expect(assessSports({ ...wrong, score: 100 } as any, 10).score).toBe(0);
    }
    expect(() =>
      assessSports({ ...submission("skeletal"), inspected: ["ribs"] }, 10),
    ).toThrow();
  });
  test("questions adapt to grade without exposing answers in the activity API", async () => {
    const db: any = {},
      labs: any = { getLabConfig: async () => ({ category: "ARTS_SPORTS" }) },
      scope: any = { getStudentScope: async () => ({ grade: 10 }) };
    const service = new SportsLabService(db, labs, scope);
    const r = await service.activities(actor);
    expect(r.activities).toHaveLength(5);
    expect(JSON.stringify(r)).not.toMatch(
      /correct_answer|"answer"|"explanation"/,
    );
    expect(sportsQuestions("energy", 10)[2].prompt).not.toBe(
      sportsQuestions("energy", 12)[2].prompt,
    );
  });
  test("other tracks cannot read progress or complete a Sports investigation", async () => {
    const db: any = { sports_Lab_Progress: { findMany: jest.fn() } },
      service = new SportsLabService(
        db,
        { getLabConfig: async () => ({ category: "ARTS_MUSIC" }) } as any,
        { getStudentScope: async () => ({ grade: 10 }) } as any,
      );
    await expect(service.progress(actor)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      service.complete(submission("energy"), actor),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.sports_Lab_Progress.findMany).not.toHaveBeenCalled();
  });
});
const real = process.env.CMS_TEST_DATABASE_URL ? test : test.skip;
real(
  "Sports progress migration preserves best score, isolates owners and stores completion once",
  async () => {
    const url = process.env.CMS_TEST_DATABASE_URL!;
    expect(["localhost", "127.0.0.1"]).toContain(new URL(url).hostname);
    const db = new PrismaClient({ datasources: { db: { url } } });
    let schoolId: number | undefined;
    try {
      const school = await db.school.create({
        data: { name: "Sports fixture", code: `SPORT-${Date.now()}` },
      });
      schoolId = school.id;
      const student = await db.user.create({
          data: {
            name: "Sports learner",
            role: "STUDENT",
            grade: "Grade 10",
            schoolId: school.id,
          },
        }),
        other = await db.user.create({
          data: {
            name: "Other learner",
            role: "STUDENT",
            grade: "Grade 10",
            schoolId: school.id,
          },
        });
      const service = new SportsLabService(
          db as any,
          { getLabConfig: async () => ({ category: "ARTS_SPORTS" }) } as any,
          { getStudentScope: async () => ({ grade: 10 }) } as any,
        ),
        a: any = { ...actor, id: student.id, schoolId: school.id };
      const p = submission("energy");
      expect((await service.complete(p, a)).score).toBe(100);
      const first = (await service.progress(a))[0];
      expect(first.completed_at).not.toBeNull();
      await service.complete(
        { ...p, answers: p.answers.map((n) => (n + 1) % 4) },
        a,
      );
      const second = (await service.progress(a))[0];
      expect(second.score).toBe(100);
      expect(second.completed_at).toEqual(first.completed_at);
      expect(await service.progress({ ...a, id: other.id })).toHaveLength(0);
      expect(
        await db.sports_Lab_Progress.count({
          where: { student_id: student.id },
        }),
      ).toBe(1);
    } finally {
      if (schoolId) {
        await db.user.deleteMany({ where: { schoolId } });
        await db.school.delete({ where: { id: schoolId } });
      }
      await db.$disconnect();
    }
  },
  30000,
);
