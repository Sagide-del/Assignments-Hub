import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateLabSessionDto } from "./dto/create-lab-session.dto";
import { LabSessionsService } from "./lab-sessions.service";
import { Role } from "../common/enums/role.enum";
import { CyberEvent, pendulumPeriod } from "../labs/studio-engine";
const conclusion =
  "The baseline admitted the events while the matching policy blocked the retest. Each defence must address the actual observed threat.";
function evidence() {
  return {
    version: "cyber-studio-v1",
    conclusion,
    events: [
      { type: "power", on: true },
      { type: "boot" },
      { type: "network", connected: true },
      { type: "run", scenario: "service" },
      {
        type: "policy",
        policy: { denyRemoteService: true, loginLimit: 0, quarantine: false },
      },
      { type: "run", scenario: "service" },
      { type: "run", scenario: "signin" },
    ] as CyberEvent[],
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
describe("Dedicated practical studios", () => {
  it("replays and saves a workstation report with authenticated ownership and derived event results", async () => {
    const { service } = setup();
    const result = await service.create(
      { labKey: "ss-cs-10-2", studio: evidence() },
      actor,
    );
    expect(result).toMatchObject({
      studentId: 42,
      schoolId: 1,
      completionSummary: {
        version: "cyber-studio-v1",
        grade: "Grade 11",
        runs: expect.arrayContaining([
          expect.objectContaining({ blocked: 5, passed: true }),
        ]),
      },
    });
  });
  it("rejects grade mismatches, unpublished labs, missing records and cross-studio reports", async () => {
    const { service, lab, prisma } = setup();
    await expect(
      service.create(
        { labKey: lab.key, studio: evidence() },
        { ...actor, grade: "Grade 9" },
      ),
    ).rejects.toThrow("Lab not found");
    lab.isPublished = false;
    await expect(
      service.create({ labKey: lab.key, studio: evidence() }, actor),
    ).rejects.toThrow("Lab not found");
    lab.isPublished = true;
    lab.key = "ss-phy-10-2";
    await expect(
      service.create({ labKey: lab.key, studio: evidence() }, actor),
    ).rejects.toThrow("match");
    prisma.lab.findUnique.mockResolvedValue(null as any);
    await expect(
      service.create({ labKey: lab.key, studio: evidence() }, actor),
    ).rejects.toThrow("Lab not found");
  });
  it("rejects an unearned completion, mixed payloads and unanswered teacher questions", async () => {
    const { service, lab } = setup();
    await expect(
      service.create(
        {
          labKey: lab.key,
          studio: {
            ...evidence(),
            events: [{ type: "run", scenario: "service" }],
          },
        },
        actor,
      ),
    ).rejects.toThrow("Power on");
    await expect(
      service.create(
        {
          labKey: lab.key,
          studio: evidence(),
          workshop: { version: "stem-workshop-v2", events: [], conclusion },
        },
        actor,
      ),
    ).rejects.toThrow("one practical report");
    (lab.questions as any[]).push({ id: 7 });
    await expect(
      service.create({ labKey: lab.key, studio: evidence() }, actor),
    ).rejects.toThrow("Answer the lab questions");
  });
  it("derives pendulum periods from complete timed intervals", async () => {
    const { service, lab } = setup();
    lab.key = "ss-phy-10-2";
    const events: any[] = [];
    for (const length of [0.4, 0.8, 0.8])
      events.push(
        { type: "configure", config: { length, angle: 15, mass: 100 } },
        { type: "release" },
        {
          type: "reading",
          cycles: 10,
          elapsed: pendulumPeriod(length, 15) * 10,
        },
      );
    const result = await service.create(
      {
        labKey: lab.key,
        studio: { version: "pendulum-studio-v1", events, conclusion },
      },
      actor,
    );
    expect((result.completionSummary as any).readings).toHaveLength(3);
    events[2].elapsed = 1;
    await expect(
      service.create(
        {
          labKey: lab.key,
          studio: { version: "pendulum-studio-v1", events, conclusion },
        },
        actor,
      ),
    ).rejects.toThrow("running apparatus");
  });
  it("bounds studio report size and validates its public DTO", async () => {
    const dto = { labKey: "ss-cs-10-2", studio: evidence() };
    expect(
      await validate(plainToInstance(CreateLabSessionDto, dto)),
    ).toHaveLength(0);
    for (const studio of [
      { ...evidence(), events: Array(501).fill({ type: "boot" }) },
      { ...evidence(), version: "other" },
      { ...evidence(), conclusion: "done" },
    ])
      expect(
        (
          await validate(
            plainToInstance(CreateLabSessionDto, { ...dto, studio }),
          )
        ).length,
      ).toBeGreaterThan(0);
  });
});
