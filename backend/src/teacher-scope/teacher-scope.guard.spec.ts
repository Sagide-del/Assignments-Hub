import { ForbiddenException } from "@nestjs/common";
import { TeacherScopeGuard } from "./teacher-scope.guard";
import { Role } from "../common/enums/role.enum";
import { resultScope, assignmentStream } from "./scope";
describe("Teacher scope guards and paired predicates", () => {
  const pairs = [
    {
      stream_id: "stream-b",
      subject: "Aviation Technology",
      stream: { grade: "Grade 11", name: "1B" },
    },
  ];
  let db: any, guard: TeacherScopeGuard;
  const actor = { id: 7, role: Role.TEACHER, schoolId: 1 } as any;
  const context = (user: any, query: unknown = {}, body: unknown = {}) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user, query, body }) }),
    }) as any;
  beforeEach(() => {
    db = {
      teacherAssignment: { findMany: jest.fn().mockResolvedValue(pairs) },
    };
    guard = new TeacherScopeGuard(db);
  });
  it("fails closed without assignments", async () => {
    db.teacherAssignment.findMany.mockResolvedValue([]);
    await expect(guard.canActivate(context(actor))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it("attaches only persisted assignments and queries within the teacher school", async () => {
    await expect(guard.canActivate(context(actor))).resolves.toBe(true);
    expect(actor.allowed_streams).toEqual([
      { stream_id: "stream-b", subject: "Aviation Technology" },
    ]);
    expect(db.teacherAssignment.findMany.mock.calls[0][0].where).toMatchObject({
      teacher_id: 7,
      school_id: 1,
      stream: { school_id: 1 },
      teacher: { role: Role.TEACHER, isActive: true, schoolId: 1 },
    });
  });
  it.each([
    { stream: "1A" },
    { stream_id: "other" },
    { schoolId: 2 },
    { school_id: 2 },
    { stream: ["1B", "1A"] },
  ])("rejects request scope overrides %j", async (query) => {
    await expect(
      guard.canActivate(context(actor, query)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each([Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN, Role.STUDENT])(
    "does not change %s permissions",
    async (role) => {
      await expect(
        guard.canActivate(context({ ...actor, role })),
      ).resolves.toBe(true);
      expect(db.teacherAssignment.findMany).not.toHaveBeenCalled();
    },
  );
  it("preserves subject-stream pairs rather than crossing unions", async () => {
    db.teacherAssignment.findMany.mockResolvedValue([
      ...pairs,
      {
        stream_id: "stream-a",
        subject: "Mathematics",
        stream: { grade: "Grade 11", name: "1A" },
      },
    ]);
    const scope: any = await resultScope(db, actor);
    expect(scope.OR).toHaveLength(2);
    expect(scope.OR[0]).toMatchObject({
      subject: { equals: "Aviation Technology" },
      student: {
        is: {
          grade: "Grade 11",
          schoolId: 1,
          studentProfile: { is: { stream: "1B" } },
        },
      },
    });
    expect(scope.OR[1].subject.equals).toBe("Mathematics");
    expect(scope.OR[1].student.is.studentProfile.is.stream).toBe("1A");
  });
  it("never guesses a stream when more than one is assigned for a subject", async () => {
    db.teacherAssignment.findMany.mockResolvedValue([
      ...pairs,
      {
        ...pairs[0],
        stream_id: "stream-a",
        stream: { grade: "Grade 11", name: "1A" },
      },
    ]);
    await expect(
      assignmentStream(db, actor, {
        grade: "Grade 11",
        subject: "Aviation Technology",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
