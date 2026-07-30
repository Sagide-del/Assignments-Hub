import { BadRequestException } from "@nestjs/common";
import { QuestionType } from "@prisma/client";
import { AiArtifactMapperService } from "./ai-artifact-mapper.service";
import { AiAssignmentArtifactContent } from "./interfaces/ai-content.types";

describe("AiArtifactMapperService", () => {
  const service = new AiArtifactMapperService();

  const content: AiAssignmentArtifactContent = {
    title: "Mensuration",
    subject: "Mathematics",
    grade: "Grade 8",
    topicName: "Volume of solids",
    difficulty: "MEDIUM",
    questions: [
      {
        questionText: "Find the volume of a 2 m cube.",
        questionType: "NUMERIC",
        correctAnswer: "8 m3",
        explanation: "Volume is length cubed.",
        points: 2,
        difficulty: "MEDIUM",
      },
      {
        questionText: "Name the formula for a cylinder's volume.",
        questionType: "SHORT_ANSWER",
        correctAnswer: "pi r squared h",
        explanation: "Multiply base area by height.",
        points: 1,
        difficulty: "EASY",
      },
    ],
  };

  it("always maps an approved artifact to an unpublished assignment draft", () => {
    const assignment = service.toCreateAssignmentDto(content);

    expect(assignment.isPublished).toBe(false);
    expect(assignment.questions).toHaveLength(2);
    expect(assignment.questions?.[0].questionType).toBe(QuestionType.NUMERIC);
    expect(assignment.questions?.[0].config).toMatchObject({
      numeric: { acceptedValue: 8, unit: "m3" },
    });
    expect(assignment.questions?.[1].config).toMatchObject({
      shortAnswer: {
        keywords: ["pi r squared h"],
        passThreshold: 1,
      },
    });
  });

  it("rejects malformed artifact content before it reaches assignments", () => {
    expect(() =>
      service.readAssignmentContent({ title: "Incomplete" }),
    ).toThrow(BadRequestException);
  });

  it("rejects numeric answers that cannot satisfy existing validation", () => {
    const invalid: AiAssignmentArtifactContent = {
      ...content,
      questions: [
        {
          ...content.questions[0],
          correctAnswer: "not a number",
        },
      ],
    };

    expect(() => service.toCreateAssignmentDto(invalid)).toThrow(
      BadRequestException,
    );
  });
});
