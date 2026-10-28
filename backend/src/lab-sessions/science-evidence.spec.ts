import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateLabSessionDto } from "./dto/create-lab-session.dto";
import { LabSessionsService } from "./lab-sessions.service";
import { Role } from "../common/enums/role.enum";
import { MOLECULES, type MolecularEvent } from "../labs/molecular-engine";
import { type StarchEvent } from "../labs/starch-engine";
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
const conclusion =
  "The results show the expected contrast when the controlled variable changes; these are idealised teaching models.";
function moleculeEvents(): MolecularEvent[] {
  return MOLECULES.filter((m) => ["ethene", "ethyne"].includes(m.id)).flatMap(
    (m) =>
      [
        { type: "choose", molecule: m.id },
        ...m.slots.map((s, slot) => ({
          type: "atom",
          slot,
          element: s.element,
        })),
        ...m.bonds.map((b) => ({ type: "bond", ...b })),
        {
          type: "record",
          explanation:
            "Bond order and connectivity satisfy the normal valencies.",
        },
      ] as MolecularEvent[],
  );
}
function starchEvents(): StarchEvent[] {
  return (["light", "dark"] as const).flatMap(
    (sample) =>
      [
        { type: "sample", sample },
        { type: "ppe" },
        { type: "burner", on: true },
        ...Array.from({ length: 2 }, () => ({ type: "heat", seconds: 10 })),
        { type: "leaf-water" },
        ...Array.from({ length: 3 }, () => ({ type: "heat", seconds: 10 })),
        { type: "burner", on: false },
        { type: "ethanol-fill" },
        { type: "leaf-ethanol" },
        { type: "tube-bath" },
        ...Array.from({ length: 6 }, () => ({ type: "heat", seconds: 10 })),
        { type: "rinse" },
        { type: "dish" },
        { type: "load-iodine" },
        { type: "iodine" },
        {
          type: "record",
          result: sample === "light" ? "blue-black" : "yellow-brown",
          explanation:
            "The observed iodine colour indicates starch presence or absence.",
        },
      ] as StarchEvent[],
  );
}
function setup(key: string) {
  const lab = {
    key,
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
describe("Chemistry and starch account evidence", () => {
  for (const [key, version, events, field] of [
    ["ss-chem-10-2", "molecular-studio-v1", moleculeEvents(), "builds"],
    ["starch-test-grade-11-v1", "starch-studio-v1", starchEvents(), "trials"],
  ] as const) {
    it(`accepts ${version} DTO and saves independently derived observations`, async () => {
      const dto = { labKey: key, studio: { version, events, conclusion } };
      expect(await validate(plainToInstance(CreateLabSessionDto, dto))).toEqual(
        [],
      );
      const { service } = setup(key);
      const report = await service.create(dto, actor);
      expect(report.studentId).toBe(42);
      expect((report.completionSummary as any)[field]).toHaveLength(2);
      expect((report.completionSummary as any).grade).toBe("Grade 11");
    });
    it(`rejects cross-grade and unearned ${version} submissions`, async () => {
      const { service, prisma } = setup(key);
      await expect(
        service.create(
          { labKey: key, studio: { version, events, conclusion } },
          { ...actor, grade: "Grade 7" },
        ),
      ).rejects.toThrow("Lab not found");
      await expect(
        service.create(
          { labKey: key, studio: { version, events: [], conclusion } },
          actor,
        ),
      ).rejects.toThrow();
      expect(prisma.labSession.create).not.toHaveBeenCalled();
    });
  }
  it("blocks absent starch catalogue migrations in the deployment readiness gate", async () => {
    const { LabsService } = await import("../labs/labs.service");
    const prisma = { lab: { count: jest.fn().mockResolvedValue(3) } };
    const service = new LabsService(prisma as any);
    await expect(service.capabilities()).rejects.toThrow("not ready");
    prisma.lab.count.mockResolvedValue(6);
    expect(await service.capabilities()).toMatchObject({
      immersiveLabsVersion: 5,
      studios: expect.arrayContaining([
        "starch-studio-v1",
        "molecular-studio-v1",
      ]),
    });
  });
});
