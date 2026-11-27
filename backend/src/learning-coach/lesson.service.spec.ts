import { LessonService } from "./lesson.service";
const actor = { id: 7, schoolId: 3, role: "STUDENT", grade: "Grade 10" } as any;
function fixture(
  grade = 10,
  subjects = ["Core Mathematics", "Biology", "Chemistry"],
) {
  const scope = { grade, subjects, assignment_subjects: subjects };
  let saved: any = null,
    progress: any = null;
  const prisma = {
    curriculumTaxonomy: {
      findMany: jest.fn().mockResolvedValue([
        {
          subject: grade >= 10 ? "Mathematics" : "Mathematics",
          topics: [grade >= 10 ? "Surds" : "Linear equations"],
        },
        { subject: "History", topics: ["Empires"] },
        { subject: "Biology", topics: ["Inheritance"] },
      ]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ weakSubjects: ["Math"] }),
    },
    lessonContent: {
      findUnique: jest.fn(async () => saved),
      upsert: jest.fn(async (args: any) => {
        saved = { id: "lesson-1", ...args.create };
        return saved;
      }),
    },
    studentLessonProgress: {
      upsert: jest.fn(async () => {
        progress ??= { status: "IN_PROGRESS", score: null, completedAt: null };
        return progress;
      }),
      findUnique: jest.fn(async () => progress),
      findUniqueOrThrow: jest.fn(async () => progress),
      updateMany: jest.fn(async (args: any) => {
        if (progress?.status !== "IN_PROGRESS") return { count: 0 };
        progress = { ...progress, ...args.data };
        return { count: 1 };
      }),
    },
  } as any;
  const ai = {
      generateAssignment: jest.fn().mockRejectedValue(Error("offline")),
    } as any,
    audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const scopes = { getStudentScope: jest.fn().mockResolvedValue(scope) } as any;
  const recovery = {
    load: jest
      .fn()
      .mockResolvedValue({
        queue: [
          {
            subject: subjects[0],
            priority: 45,
            topics: [{ topic: grade >= 10 ? "Surds" : "Linear equations" }],
          },
        ],
      }),
  } as any;
  return {
    service: new LessonService(prisma, ai, audit, scopes, recovery),
    prisma,
    ai,
    audit,
    scopes,
    recovery,
    setLesson: (v: any) => (saved = v),
  };
}
describe("Guided Coach lessons", () => {
  it("uses recovery priorities, canonical subjects and grade-specific enrolled topics", async () => {
    const { service } = fixture();
    const topics = await service.topics(actor);
    expect(topics[0]).toEqual({
      subject: "Core Mathematics",
      topic: "Surds",
      priority: true,
    });
    expect(topics.some((t) => t.subject === "History")).toBe(false);
    expect(new Set(topics.map((t) => t.subject + ":" + t.topic)).size).toBe(
      topics.length,
    );
  });
  it('lets fresh recovery evidence override an old weak-subject flag', async()=>{
    const {service,recovery}=fixture();
    recovery.load.mockResolvedValue({queue:[{subject:'Core Mathematics',priority:0,topics:[{topic:'Surds'}]}]});
    expect((await service.topics(actor)).find(t=>t.topic==='Surds')?.priority).toBe(false);
  });
  it("keeps junior topics within the learner’s actual grade and enrolment", async () => {
    const { service, prisma } = fixture(8, [
      "Mathematics",
      "Integrated Science",
    ]);
    const rows = await service.topics({ ...actor, grade: "Grade 12" });
    expect(
      prisma.curriculumTaxonomy.findMany.mock.calls[0][0].where.grade,
    ).toBe(8);
    expect(
      rows.some((r) => r.subject === "Biology" || r.topic === "Surds"),
    ).toBe(false);
  });
  it("rejects direct requests outside enrolment or for invented topics before calling AI", async () => {
    const { service, ai } = fixture();
    await expect(service.open("History", "Empires", actor)).rejects.toThrow(
      "enrolment",
    );
    await expect(
      service.open("Mathematics", "Invented subject prompt", actor),
    ).rejects.toThrow("not available");
    expect(ai.generateAssignment).not.toHaveBeenCalled();
  });
  it("provides a real worked example when AI is unavailable", async () => {
    const { service, prisma } = fixture();
    const lesson = await service.open("Math", "Surds", actor);
    expect(lesson.subject).toBe("Core Mathematics");
    expect(lesson.script[1].text).toContain("6√2");
    expect(
      lesson.script.find((s) => s.type === "QUESTION")?.correctAnswer,
    ).toBe("5√2");
    expect(prisma.lessonContent.upsert).toHaveBeenCalledTimes(1);
  });
  it.each([
    { script: [null, null, null] },
    {
      script: [
        { type: "GREETING", text: "Hello" },
        { type: "EXPLANATION", text: "Work through the example." },
        {
          type: "QUESTION",
          text: "Choose",
          questionOptions: ["A", "B", "C"],
          correctAnswer: "Z",
        },
      ],
    },
    {
      script: [
        { type: "GREETING", text: "Hello" },
        { type: "EXPLANATION", text: "Surds is a key idea in Mathematics." },
        {
          type: "QUESTION",
          text: "Choose",
          questionOptions: ["A", "B", "C"],
          correctAnswer: "A",
        },
      ],
    },
  ])(
    "rejects malformed or generic AI lessons without caching them",
    async (content) => {
      const { service, ai } = fixture();
      ai.generateAssignment.mockResolvedValue({ content });
      const lesson = await service.open("Mathematics", "Surds", actor);
      expect(lesson.script[1].text).toContain("6√2");
    },
  );
  it("does not cache pretend subject content when no offline example is available", async () => {
    const { service, prisma } = fixture(10, ["English"]);
    prisma.curriculumTaxonomy.findMany.mockResolvedValue([
      { subject: "English", topics: ["Reading comprehension"] },
    ]);
    await expect(
      service.open("English", "Reading comprehension", actor),
    ).rejects.toThrow("not ready");
    expect(prisma.lessonContent.upsert).not.toHaveBeenCalled();
  });
  it("repairs an old generic cached lesson", async () => {
    const f = fixture();
    f.setLesson({
      id: "old",
      subject: "Core Mathematics",
      topic: "Surds",
      gradeLevel: 10,
      scriptJson: [
        {
          type: "QUESTION",
          text: "Surds is a key idea in Mathematics.",
          questionOptions: ["A", "B"],
          correctAnswer: "A",
        },
      ],
    });
    const lesson = await f.service.open("Mathematics", "Surds", actor);
    expect(lesson.script[1].text).toContain("6√2");
    expect(f.ai.generateAssignment).toHaveBeenCalledTimes(1);
  });
  it("grades first answers on the server and preserves one completion event on retries", async () => {
    const { service, audit } = fixture();
    await service.open("Mathematics", "Surds", actor);
    const first = await service.complete("lesson-1", ["25√2"], actor);
    expect(first.progress.score).toBe(0);
    const at = first.progress.completedAt;
    const retry = await service.complete("lesson-1", ["5√2"], actor);
    expect(retry.progress.score).toBe(0);
    expect(retry.progress.completedAt).toEqual(at);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed answers, unopened lessons and a lesson from another grade", async () => {
    const f = fixture();
    const opened = await f.service.open("Mathematics", "Surds", actor);
    await expect(
      f.service.complete(opened.id, ["not an option"], actor),
    ).rejects.toThrow("one valid");
    f.prisma.studentLessonProgress.findUnique.mockResolvedValue(null);
    await expect(f.service.complete(opened.id, ["5√2"], actor)).rejects.toThrow(
      "Open this lesson",
    );
    f.setLesson({ ...opened, gradeLevel: 12, scriptJson: opened.script });
    await expect(f.service.complete(opened.id, ["5√2"], actor)).rejects.toThrow(
      "different grade",
    );
  });
  it("does not turn a legacy client-supplied percentage into a verified score", async () => {
    const { service } = fixture();
    await service.open("Mathematics", "Surds", actor);
    const result = await service.complete("lesson-1", undefined, actor);
    expect(result.progress.score).toBeNull();
  });
});
