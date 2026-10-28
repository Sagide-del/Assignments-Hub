import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateLabSessionDto } from "./dto/create-lab-session.dto";
import { LabSessionsService } from "./lab-sessions.service";
import { Role } from "../common/enums/role.enum";
import {
  RESPIRATORY_STRUCTURES,
  RespiratoryEvent,
} from "../labs/respiratory-engine";
function evidence() {
  const events: RespiratoryEvent[] = RESPIRATORY_STRUCTURES.filter(
    (s) => s !== "alveoli",
  ).map((structure) => ({ type: "inspect", structure }));
  for (const config of [
    { rate: 12, tidalVolume: 0.5 },
    { rate: 24, tidalVolume: 0.25 },
    { rate: 8, tidalVolume: 0.75 },
  ])
    events.push(
      { type: "configure", config },
      {
        type: "observe",
        cycles: 2,
        elapsed: 120 / config.rate,
        notes: "Inspiration lowered the diaphragm and the lungs expanded.",
      },
    );
  return {
    version: "respiratory-studio-v1",
    events,
    conclusion:
      "Equal minute ventilation did not give equal alveolar ventilation. The model assumes fixed adult anatomical dead space and illustrates breathing motion.",
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
    key: "ss-bio-10-5",
    title: "Respiratory System Simulator",
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
describe("Respiratory studio account reports", () => {
  it("derives ventilation from replayed observations and saves it for the authenticated grade and student", async () => {
    const { service } = setup();
    const report = await service.create(
      { labKey: "ss-bio-10-5", studio: evidence() },
      actor,
    );
    expect(report).toMatchObject({
      studentId: 42,
      schoolId: 1,
      completionSummary: {
        version: "respiratory-studio-v1",
        grade: "Grade 11",
        observations: expect.arrayContaining([
          expect.objectContaining({
            rate: 24,
            tidalVolume: 0.25,
            minuteVentilation: 6,
          }),
        ]),
      },
    });
    expect(
      (report.completionSummary as any).observations[1].alveolarVentilation,
    ).toBeCloseTo(2.4);
  });
  it("rejects unearned observations, cross-grade access and cross-activity evidence", async () => {
    const { service, lab } = setup();
    await expect(
      service.create(
        { labKey: lab.key, studio: evidence() },
        { ...actor, grade: "Grade 7" },
      ),
    ).rejects.toThrow("Lab not found");
    await expect(
      service.create(
        { labKey: lab.key, studio: { ...evidence(), events: [] } },
        actor,
      ),
    ).rejects.toThrow("Inspect");
    lab.key = "ss-cs-10-2";
    await expect(
      service.create({ labKey: lab.key, studio: evidence() }, actor),
    ).rejects.toThrow("match");
  });
  it("accepts the bounded respiratory DTO and requires teacher questions", async () => {
    const dto = { labKey: "ss-bio-10-5", studio: evidence() };
    expect(
      await validate(plainToInstance(CreateLabSessionDto, dto)),
    ).toHaveLength(0);
    const { service, lab } = setup();
    (lab.questions as any[]).push({ id: 19 });
    await expect(service.create(dto, actor)).rejects.toThrow(
      "Answer the lab questions",
    );
    expect(
      (
        await validate(
          plainToInstance(CreateLabSessionDto, {
            ...dto,
            studio: {
              ...evidence(),
              events: Array(501).fill({
                type: "inspect",
                structure: "trachea",
              }),
            },
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
