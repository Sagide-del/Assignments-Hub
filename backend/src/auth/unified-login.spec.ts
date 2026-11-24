import { AuthService } from "./auth.service";
import { Role } from "../common/enums/role.enum";

describe("Unified login account resolution", () => {
  let service: AuthService, prisma: any;
  beforeEach(() => {
    prisma = { user: { findMany: jest.fn() } };
    service = new AuthService(prisma, {} as any, {} as any, {} as any);
    jest
      .spyOn(service, "loginStaff")
      .mockResolvedValue({ user: { role: Role.TEACHER } } as any);
    jest
      .spyOn(service, "loginStudent")
      .mockResolvedValue({ user: { role: Role.STUDENT } } as any);
    jest
      .spyOn(service, "loginIndependentStudent")
      .mockResolvedValue({ user: { role: Role.STUDENT } } as any);
  });
  it.each([Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN])(
    "resolves %s from stored role and delegates password verification",
    async (role) => {
      prisma.user.findMany.mockResolvedValue([
        { role, email: "staff@example.test", school: { code: "DEMO" } },
      ]);
      await service.loginUnified(
        { identifier: "staff@example.test", password: "private" },
        "ip",
      );
      expect(service.loginStaff).toHaveBeenCalledWith(
        {
          schoolCode: "DEMO",
          email: "staff@example.test",
          password: "private",
        },
        "ip",
      );
      expect(service.loginStudent).not.toHaveBeenCalled();
    },
  );
  it("uses existing school learner verification and PIN", async () => {
    prisma.user.findMany.mockResolvedValue([
      { role: Role.STUDENT, admissionNumber: "S001", school: { code: "DEMO" } },
    ]);
    await service.loginUnified({
      identifier: "S001",
      password: "1234",
      schoolCode: " demo ",
    });
    expect(prisma.user.findMany.mock.calls[0][0].where.school).toEqual({
      code: "DEMO",
    });
    expect(service.loginStudent).toHaveBeenCalledWith(
      { schoolCode: "DEMO", admissionNumber: "S001", pin: "1234" },
      undefined,
    );
  });
  it("retains the legacy PIN-free school login only through its existing verifier", async () => {
    prisma.user.findMany.mockResolvedValue([
      { role: Role.STUDENT, admissionNumber: "S001", school: { code: "DEMO" } },
    ]);
    await service.loginUnified({ identifier: "S001", schoolCode: "DEMO" });
    expect(service.loginStudent).toHaveBeenCalledWith(
      { schoolCode: "DEMO", admissionNumber: "S001" },
      undefined,
    );
  });
  it("preserves independent password, subscription and trial checks", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        role: Role.STUDENT,
        admissionNumber: "VICTOR",
        passwordHash: "hash",
        school: { code: "INDEPENDENT" },
      },
    ]);
    await service.loginUnified({ identifier: "victor", password: "private" });
    expect(service.loginIndependentStudent).toHaveBeenCalledWith(
      { identifier: "VICTOR", password: "private" },
      undefined,
    );
    expect(service.loginStudent).not.toHaveBeenCalled();
  });
  it("never guesses between tenants or exposes whether an identifier exists", async () => {
    for (const found of [
      [],
      [{ role: Role.STUDENT }, { role: Role.TEACHER }],
    ]) {
      prisma.user.findMany.mockResolvedValue(found);
      await expect(
        service.loginUnified({ identifier: "duplicate", password: "secret" }),
      ).rejects.toThrow("Check your login details");
    }
    expect(service.loginStaff).not.toHaveBeenCalled();
    expect(service.loginStudent).not.toHaveBeenCalled();
  });
  it("preserves the numeric school PIN requirement", async () => {
    prisma.user.findMany.mockResolvedValue([
      { role: Role.STUDENT, admissionNumber: "S001", school: { code: "DEMO" } },
    ]);
    await expect(
      service.loginUnified({ identifier: "S001", password: "not-a-pin" }),
    ).rejects.toThrow("Check your login details");
    expect(service.loginStudent).not.toHaveBeenCalled();
  });
  it("keeps bad-password errors indistinguishable from unknown accounts", async () => {
    const { UnauthorizedException } = await import("@nestjs/common");
    prisma.user.findMany.mockResolvedValue([
      {
        role: Role.TEACHER,
        email: "staff@example.test",
        school: { code: "DEMO" },
      },
    ]);
    (service.loginStaff as jest.Mock).mockRejectedValue(
      new UnauthorizedException("Invalid credentials"),
    );
    await expect(
      service.loginUnified({
        identifier: "staff@example.test",
        password: "wrong",
      }),
    ).rejects.toThrow("Check your login details");
  });
  it("requires a secret for staff and independent accounts", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        role: Role.TEACHER,
        email: "staff@example.test",
        school: { code: "DEMO" },
      },
    ]);
    await expect(
      service.loginUnified({ identifier: "staff@example.test" }),
    ).rejects.toThrow("Check your login details");
    expect(service.loginStaff).not.toHaveBeenCalled();
  });
});
