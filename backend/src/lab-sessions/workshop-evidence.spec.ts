import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  practicalFor,
  initialPractical,
  transition,
  PracticalEvent,
} from "../labs/practical-engine";
import { LabSessionsService } from "./lab-sessions.service";
import { CreateLabSessionDto } from "./dto/create-lab-session.dto";
import { Role } from "../common/enums/role.enum";
function evidence() {
  const spec = practicalFor({ key: "ss-cs-10-2" });
  let s = initialPractical(spec);
  for (let i = 0; i < 3; i++)
    s = transition(spec, s, {
      type: "place",
      tool: i,
      x: 0,
      z: 0,
      rotation: 0,
    });
  for (let trial = 0; trial < 3; trial++) {
    s = transition(spec, s, { type: "setting", value: trial + 1 });
    for (let i = 0; i < 5; i++)
      s = transition(spec, s, { type: "action", index: i });
    s = transition(spec, s, {
      type: "record",
      observation:
        "The repeated simulated events were blocked by the enabled defence.",
    });
  }
  return {
    version: "stem-workshop-v2",
    events: s.events,
    conclusion:
      "Comparing three scenarios showed why a defence must be enabled and retested. These results describe a local teaching model.",
  };
}
const actor = {
  id: 42,
  schoolId: 1,
  role: Role.STUDENT,
  name: "Student",
  grade: "Grade 11",
  isIndependentTrial: false,
  email: null,
  admissionNumber: null,
};
function setup() {
  const lab = {
    key: "ss-cs-10-2",
    title: "Cybersecurity Simulator",
    grade: "Grade 11",
    isPublished: true,
    status: "PUBLISHED",
    questions: [],
    competency: "Digital literacy",
  };
  const prisma = {
    lab: { findUnique: jest.fn().mockResolvedValue(lab) },
    labSession: {
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
    },
  };
  return { lab, prisma, service: new LabSessionsService(prisma as any) };
}
describe("3D workshop evidence", () => {
  it("requires practical evidence for a real non-titration catalogue lab", async () => {
    const { service, lab } = setup();
    await expect(service.create({ labKey: lab.key }, actor)).rejects.toThrow(
      "requires its practical event log",
    );
  });
  it("replays evidence, derives readings and stores the authenticated learner grade and report", async () => {
    const { service, prisma } = setup();
    const result = await service.create(
      { labKey: "ss-cs-10-2", workshop: evidence() },
      actor,
    );
    expect(result).toMatchObject({
      studentId: 42,
      schoolId: 1,
      completionSummary: {
        grade: "Grade 11",
        model: "cyber",
        trials: expect.arrayContaining([
          expect.objectContaining({ result: 3 }),
        ]),
      },
    });
    expect(prisma.labSession.create).toHaveBeenCalledTimes(1);
  });
  it("rejects skipped procedures, impossible placements and unearned completion", async () => {
    for (const events of [
      [{ type: "action", index: 2 }],
      [{ type: "place", tool: 0, x: 999, z: 0, rotation: 0 }],
      [],
    ]) {
      const { service, prisma } = setup();
      await expect(
        service.create(
          {
            labKey: "ss-cs-10-2",
            workshop: { ...evidence(), events: events as PracticalEvent[] },
          },
          actor,
        ),
      ).rejects.toThrow();
      expect(prisma.labSession.create).not.toHaveBeenCalled();
    }
  });
  it("rejects cross-grade, unpublished and missing labs", async () => {
    const { service, lab, prisma } = setup();
    await expect(
      service.create(
        { labKey: lab.key, workshop: evidence() },
        { ...actor, grade: "Grade 9" },
      ),
    ).rejects.toThrow("Lab not found");
    lab.isPublished = false;
    await expect(
      service.create({ labKey: lab.key, workshop: evidence() }, actor),
    ).rejects.toThrow("Lab not found");
    prisma.lab.findUnique.mockResolvedValue(null as any);
    await expect(
      service.create({ labKey: lab.key, workshop: evidence() }, actor),
    ).rejects.toThrow("Lab not found");
  });
  it("requires teacher questions and does not accept workshop events as titration evidence", async () => {
    const { service, lab } = setup();
    (lab.questions as any[]).push({ id: 7 });
    await expect(
      service.create({ labKey: lab.key, workshop: evidence() }, actor),
    ).rejects.toThrow("Answer the lab questions");
    lab.key = "3d-titration-grade-11-v1";
    await expect(
      service.create({ labKey: lab.key, workshop: evidence() }, actor),
    ).rejects.toThrow("titration evidence");
  });
  it("bounds the public report DTO and rejects malformed evidence", async () => {
    const dto = { labKey: "ss-cs-10-2", workshop: evidence() };
    expect(
      await validate(plainToInstance(CreateLabSessionDto, dto)),
    ).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(CreateLabSessionDto, {
            ...dto,
            workshop: {
              ...evidence(),
              events: Array(301).fill({ type: "reset" }),
            },
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(CreateLabSessionDto, {
            ...dto,
            workshop: { ...evidence(), conclusion: 7 },
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
