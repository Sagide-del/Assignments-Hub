import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  AiArtifactStatus,
  AiArtifactType,
  AiExtractionStatus,
} from "@prisma/client";
import { Role } from "../common/enums/role.enum";
import { AiArtifactService } from "./ai-artifact.service";
import { AiExtractionService } from "./ai-extraction.service";

describe("AI content tenant security", () => {
  const teacher = {
    id: 10,
    schoolId: 4,
    role: Role.TEACHER,
    name: "Teacher",
    email: null,
    admissionNumber: null,
    grade: null,
  };
  const student = { ...teacher, id: 20, role: Role.STUDENT };

  it("hides cross-school artifacts", async () => {
    const prisma = {
      aiContentArtifact: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          schoolId: 99,
          type: AiArtifactType.ASSIGNMENT_DRAFT,
          status: AiArtifactStatus.GENERATED,
          generationJob: { requestedById: teacher.id },
          reviews: [],
        }),
      },
    };
    const service = new AiArtifactService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne(1, teacher)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("does not expose artifacts to students in the same school", async () => {
    const prisma = {
      aiContentArtifact: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          schoolId: student.schoolId,
          type: AiArtifactType.ASSIGNMENT_DRAFT,
          status: AiArtifactStatus.GENERATED,
          generationJob: { requestedById: teacher.id },
          reviews: [],
        }),
      },
    };
    const service = new AiArtifactService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne(1, student)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("prevents teachers managing another teacher's artifact", async () => {
    const prisma = {
      aiContentArtifact: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          schoolId: teacher.schoolId,
          type: AiArtifactType.ASSIGNMENT_DRAFT,
          status: AiArtifactStatus.GENERATED,
          generationJob: { requestedById: 999 },
          reviews: [],
        }),
      },
    };
    const service = new AiArtifactService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne(1, teacher)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("hides cross-school PDF extraction content", async () => {
    const prisma = {
      aiExtractedContent: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          schoolId: 99,
          uploadedById: 55,
          fileName: "private.pdf",
          subject: "Biology",
          grade: "Grade 10",
          topicCount: 1,
          content: { topics: [] },
          status: AiExtractionStatus.COMPLETED,
          error: null,
          processedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };
    const service = new AiExtractionService(
      prisma as never,
      { assertEnabled: jest.fn().mockResolvedValue({}) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.getContent(8, teacher)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
