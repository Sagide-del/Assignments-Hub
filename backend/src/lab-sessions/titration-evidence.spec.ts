import "reflect-metadata";
import {
  assessTitration,
  titrationPH,
  type TitrationEvidence,
} from "./titration-evidence";
import { LabSessionsService } from "./lab-sessions.service";
import { Role } from "../common/enums/role.enum";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateLabSessionDto } from "./dto/create-lab-session.dto";
const evidence = () => ({
  version: "titration-3d-v1",
  trials: [
    {
      id: 1,
      initial: 0.2,
      final: 25.2,
      dispensed: 25,
      rough: true,
      mixed: true,
      colour: "Deep pink",
      notes: "Rough endpoint overshot.",
    },
    {
      id: 2,
      initial: 0.65,
      final: 24.65,
      dispensed: 24,
      rough: false,
      mixed: true,
      colour: "Pale pink",
      notes: "Faint persistent pink.",
    },
    {
      id: 3,
      initial: 1.1,
      final: 25.1,
      dispensed: 24,
      rough: false,
      mixed: true,
      colour: "Pale pink",
      notes: "Concordant repeat.",
    },
  ],
  selected: [2, 3],
  calculation: 0.096,
  conclusion:
    "Two concordant titres gave 0.096 mol/dm3. Read the meniscus at eye level to reduce parallax error.",
});
describe("Titration practical evidence", () => {
  it("uses mole balance and water equilibrium, including pH 7 at equivalence", () => {
    expect(titrationPH(0)).toBeCloseTo(-Math.log10(0.0959), 8);
    expect(titrationPH(23.975)).toBeCloseTo(7, 7);
    expect(titrationPH(24)).toBeGreaterThan(8.2);
    expect(titrationPH(24)).toBeLessThan(10);
    expect(titrationPH(24.1)).toBeGreaterThan(10);
  });
  it("accepts concordant accurate trials and keeps rough/observation evidence", () => {
    const result = assessTitration(evidence());
    expect(result.meanTitre).toBe(24);
    expect(result.calculatedConcentration).toBeCloseTo(0.096, 8);
    expect(result.trials).toHaveLength(3);
  });
  it("rejects skipped, overshot, unmixed, nonconcordant or misread trials and wrong calculations", () => {
    const changes: Array<(e: TitrationEvidence) => unknown> = [
      (e) => e.trials.splice(0, 1),
      (e) => e.selected.push(99),
      (e) => e.selected.push(2),
      (e) => (e.trials[2].rough = true),
      (e) => (e.trials[2].mixed = false),
      (e) => (e.trials[2].dispensed = 25),
      (e) => (e.trials[2].initial = 5),
      (e) => (e.trials[2].final = 25.3),
      (e) => (e.calculation = 0.96),
      (e) => (e.conclusion = "done"),
      (e) => (e.trials[2].colour = "Colourless"),
    ];
    for (const change of changes) {
      const data = evidence();
      change(data);
      expect(() => assessTitration(data)).toThrow();
    }
  });
  it("validates nested request bounds before the service runs", async () => {
    expect(
      await validate(
        plainToInstance(CreateLabSessionDto, {
          labKey: "3d-titration-grade-11-v1",
          practical: evidence(),
        }),
      ),
    ).toHaveLength(0);
    const bad = evidence();
    bad.trials[2].dispensed = Infinity;
    expect(
      (
        await validate(
          plainToInstance(CreateLabSessionDto, {
            labKey: "test",
            practical: bad,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
describe("Titration account completion", () => {
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
      key: "3d-titration-grade-11-v1",
      grade: "Grade 11",
      isPublished: true,
      status: "PUBLISHED",
      questions: [],
      competency: "Investigation",
    };
    const prisma = {
      lab: { findUnique: jest.fn().mockResolvedValue(lab) },
      labSession: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 1, ...data }),
          ),
      },
    };
    return { lab, prisma, service: new LabSessionsService(prisma as any) };
  }
  it("stores the practical report separately from quiz answers, scoped to the authenticated learner", async () => {
    const { prisma, service } = setup();
    const result = await service.create(
      { labKey: "3d-titration-grade-11-v1", practical: evidence() },
      actor,
    );
    expect(result).toMatchObject({
      studentId: 42,
      schoolId: 1,
      completionSummary: { version: "titration-3d-v1", meanTitre: 24 },
    });
    expect(prisma.labSession.create).toHaveBeenCalledTimes(1);
  });
  it("rejects mismatched grade, missing evidence and unpublished labs", async () => {
    const { service, lab, prisma } = setup();
    await expect(
      service.create(
        { labKey: lab.key, practical: evidence() },
        { ...actor, grade: "Grade 10" },
      ),
    ).rejects.toThrow("Lab not found");
    await expect(service.create({ labKey: lab.key }, actor)).rejects.toThrow(
      "requires its recorded evidence",
    );
    lab.isPublished = false;
    await expect(
      service.create({ labKey: lab.key, practical: evidence() }, actor),
    ).rejects.toThrow("Lab not found");
    expect(prisma.labSession.create).not.toHaveBeenCalled();
  });
  it("preserves required CMS quiz questions and rejects cross-lab evidence", async () => {
    const { service, lab } = setup();
    (lab.questions as any[]).push({
      id: 8,
      questionText: "Why use an indicator?",
    });
    await expect(
      service.create({ labKey: lab.key, practical: evidence() }, actor),
    ).rejects.toThrow("Answer the lab questions");
    lab.key = "other-lab";
    await expect(
      service.create({ labKey: lab.key, practical: evidence() }, actor),
    ).rejects.toThrow("does not accept titration");
  });
});
