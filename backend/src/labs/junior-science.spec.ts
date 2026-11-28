import {
  juniorInitial,
  juniorReading,
  replayJunior,
  juniorReady,
  focusTarget,
  type JuniorEvent,
  type JuniorKind,
} from "./junior-science";
import { assessJunior } from "./junior-assessor";
import { LabSessionsService } from "../lab-sessions/lab-sessions.service";
function events(kind: JuniorKind): JuniorEvent[] {
  const c = juniorInitial().config;
  return [
    { type: "predict", choice: "first" },
    {
      type: "configure",
      config: { ...c, filter: 1000, objective: 4, focus: 0, phase: 0 },
    },
    {
      type: "record",
      observation: "I recorded the first reading and its units.",
    },
    {
      type: "configure",
      config: {
        ...c,
        filter: 20,
        objective: 40,
        focus: focusTarget(40),
        phase: 180,
      },
    },
    {
      type: "record",
      observation: "I compared the second reading with the first.",
    },
    { type: "answer", question: 0, choice: kind === "microscope" ? 0 : 1 },
    { type: "answer", question: 1, choice: kind === "microscope" ? 1 : 2 },
  ];
}
const conclusion =
  "I compared the readings under two conditions and held the other relevant variables constant. The result applies only to this simplified model.";
describe("Junior science investigations", () => {
  it("conserves suspended mass while leaving dissolved salt in the filtrate", () => {
    const c = juniorInitial().config;
    expect(juniorReading("filtration", { ...c, filter: 20 })).toMatchObject({
      reading: 10,
      secondary: 0,
    });
    expect(juniorReading("filtration", { ...c, filter: 1000 })).toMatchObject({
      reading: 4,
      secondary: 6,
    });
    for (const filter of [20, 100, 1000] as const) {
      const r = juniorReading("filtration", { ...c, filter });
      expect(r.reading + r.secondary).toBe(10);
      expect(r.detail).toContain("7 g dissolved salt");
    }
  });
  it("links objective power to magnification and field diameter", () => {
    const c = juniorInitial().config;
    expect(juniorReading("microscope", { ...c, objective: 40 })).toMatchObject({
      reading: 400,
      secondary: 0.45,
    });
    expect(juniorReading("microscope", { ...c, objective: 4 }).secondary).toBe(
      4.5,
    );
    expect(() =>
      replayJunior("microscope", [
        { type: "predict", choice: "second" },
        { type: "configure", config: { ...c, objective: 40, focus: 0 } },
        {
          type: "record",
          observation: "The specimen is a blur at this setting.",
        },
      ]),
    ).toThrow("focus");
  });
  it("derives constructive/destructive amplitude and wavelength correctly", () => {
    const c = juniorInitial().config;
    expect(juniorReading("waves", { ...c, phase: 0 }).reading).toBe(2);
    expect(juniorReading("waves", { ...c, phase: 180 }).reading).toBeCloseTo(0);
    expect(juniorReading("waves", { ...c, frequency: 4 }).secondary).toBe(0.5);
  });
  it.each(["filtration", "microscope", "waves"] as const)(
    "requires a prediction and a genuine comparison for %s",
    (kind) => {
      const e = events(kind),
        s = replayJunior(kind, e);
      expect(juniorReady(kind, s, conclusion)).toBe(true);
      expect(
        juniorReady(kind, { ...s, trials: s.trials.slice(0, 1) }, conclusion),
      ).toBe(false);
      expect(() =>
        replayJunior(
          kind,
          e.filter((x) => x.type !== "predict"),
        ),
      ).toThrow("prediction");
      expect(() =>
        replayJunior(kind, [...e, { type: "predict", choice: "same" }]),
      ).toThrow("before");
    },
  );
  it("rejects confounded phase comparisons and unsafe settings", () => {
    const e = events("waves");
    const c = e[3];
    if (c.type === "configure") c.config.frequency = 4;
    expect(juniorReady("waves", replayJunior("waves", e), conclusion)).toBe(
      false,
    );
    expect(() =>
      replayJunior("waves", [
        {
          type: "configure",
          config: { ...juniorInitial().config, frequency: NaN },
        },
      ]),
    ).toThrow();
    expect(() =>
      replayJunior(
        "waves",
        Array(201).fill({ type: "predict", choice: "same" }),
      ),
    ).toThrow("200");
  });
  it("grades knowledge separately from a recorded, unmarked explanation", () => {
    const r = assessJunior("junior-science-g7-filtration-v1", {
      version: "junior-science-v1",
      events: events("filtration"),
      conclusion,
    });
    expect(r.knowledgeCheck.score).toBe(2);
    expect(r.reasoningStatus).toBe("RECORDED_NOT_TEACHER_ASSESSED");
    expect(r.trials).toHaveLength(2);
    expect(() =>
      assessJunior("junior-science-g7-filtration-v1", {
        version: "stem-workshop-v2",
        events: [],
        conclusion,
      }),
    ).toThrow();
  });
  it("rejects old generic evidence and preserves grade restrictions on submission", async () => {
    const db = {
      lab: {
        findUnique: jest.fn().mockResolvedValue({
          key: "junior-science-g7-filtration-v1",
          grade: "Grade 7",
          status: "PUBLISHED",
          isPublished: true,
          questions: [],
        }),
      },
      labSession: { create: jest.fn().mockImplementation((v) => v.data) },
    };
    const service = new LabSessionsService(db as any),
      actor = { id: 1, schoolId: 1, role: "STUDENT", grade: "Grade 7" } as any;
    await expect(
      service.create(
        {
          labKey: "junior-science-g7-filtration-v1",
          workshop: { version: "stem-workshop-v2", events: [], conclusion },
        } as any,
        actor,
      ),
    ).rejects.toThrow("grade-specific");
    await expect(
      service.create(
        {
          labKey: "junior-science-g7-filtration-v1",
          studio: {
            version: "junior-science-v1",
            events: events("filtration"),
            conclusion,
          },
        } as any,
        { ...actor, grade: "Grade 8" },
      ),
    ).rejects.toThrow("Lab not found");
    const result = await service.create(
      {
        labKey: "junior-science-g7-filtration-v1",
        studio: {
          version: "junior-science-v1",
          events: events("filtration"),
          conclusion,
        },
      } as any,
      actor,
    );
    expect(result).toMatchObject({ score: 2, maxScore: 2 });
    expect(db.labSession.create).toHaveBeenCalledTimes(1);
  });
});
