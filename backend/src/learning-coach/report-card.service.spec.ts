import { NotFoundException } from "@nestjs/common";
import { ReportCardService } from "./report-card.service";

describe("ReportCardService", () => {
  const actor = {
    id: 7,
    schoolId: 3,
    name: "Bismarck Rowlings",
    email: null,
    admissionNumber: "15525",
  } as any;

  function serviceWith(report: any) {
    const tx = {
      learningCoachReportCard: { update: jest.fn().mockResolvedValue(report) },
      user: { update: jest.fn().mockResolvedValue({}) },
      studentStudyPlan: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      learningCoachReportCard: { findFirst: jest.fn().mockResolvedValue(report) },
      $transaction: jest.fn((callback) => callback(tx)),
    } as any;
    const uploads = { createPrivatePreviewUrl: jest.fn().mockResolvedValue("https://signed.example/report") } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const ocr = {} as any;
    return { service: new ReportCardService(prisma, uploads, audit, ocr), prisma, uploads, tx };
  }

  it("uses corrected scores to create a color-coded diagnosis", async () => {
    const { service, tx } = serviceWith({ id: 11, assetKey: "uploads/learning-coach-report-cards/3/7/2026/11/report.jpg", fileName: "report.jpg" });

    const result = await service.confirm(11, {
      scores: [
        { subject: "Computer Studies", percentage: 90 },
        { subject: "Mathematics", percentage: 4 },
        { subject: "Physics", percentage: 30 },
        { subject: "English", percentage: 48 },
      ],
    }, actor);

    expect(result.diagnosis.colorCodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ subject: "Computer Studies", color: "GREEN" }),
      expect.objectContaining({ subject: "Mathematics", color: "RED" }),
      expect.objectContaining({ subject: "English", color: "YELLOW" }),
    ]));
    expect(result.diagnosis.message).toContain("Bismarck");
    expect(tx.learningCoachReportCard.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "ANALYZED" }),
    }));
  });

  it("returns a short-lived preview only for the learner's own report", async () => {
    const { service, uploads } = serviceWith({
      id: 11,
      assetKey: "uploads/learning-coach-report-cards/3/7/2026/11/report.jpg",
      fileName: "report.jpg",
    });

    await expect(service.previewUrl(11, actor)).resolves.toEqual({ url: "https://signed.example/report" });
    expect(uploads.createPrivatePreviewUrl).toHaveBeenCalledWith(expect.any(String), 300);

    const { service: missing } = serviceWith(null);
    await expect(missing.previewUrl(99, actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("extracts only recognised curriculum subjects from a report-card table", () => {
    const { service } = serviceWith(null);
    const scores = (service as any).parseTableRows([
      ["LEARNING AREA", "TERM 3 ASSESSMENT", "RUBRICS", "REMARKS"],
      ["ENGLISH", "48%", "5(me2)", "Meeting expectation"],
      ["MATHEMATICS", "4%", "1(be2)", "Below expectation"],
      ["COMPUTER STUDIES", "90%", "8(ee1)", "Exceeding expectation"],
      ["Tel Line 1: 0710 926 168", "", "", ""],
    ]);

    expect(scores).toEqual([
      { subject: "English", percentage: 48 },
      { subject: "Mathematics", percentage: 4 },
      { subject: "Computer Studies", percentage: 90 },
    ]);
  });

  it("provides subject-specific recovery techniques", async () => {
    const { service } = serviceWith({ id: 11 });
    const result = await service.confirm(11, {
      scores: [{ subject: "Mathematics", percentage: 4 }],
    }, actor);

    expect(result.diagnosis.learningTechniques.Mathematics).toContain("Feynman");
  });
});
