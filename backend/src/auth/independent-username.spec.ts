import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { RegisterIndependentStudentDto } from "./dto/register-independent-student.dto";
import { Role } from "../common/enums/role.enum";
const registration = {
  name: "Sam Jeptoo",
  username: "sam.jeptoo",
  grade: "Grade 11",
  password: "strong-test-password",
  parentPhone: "0712345678",
};
function setup() {
  const prisma = {
    school: {
      upsert: jest.fn().mockResolvedValue({ id: 8 }),
      findUnique: jest.fn().mockResolvedValue({ id: 8 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ id: 42, ...data })),
    },
    refreshToken: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  };
  const audit = { record: jest.fn() };
  const service = new AuthService(
    prisma as never,
    { sign: jest.fn().mockReturnValue("token") } as never,
    audit as never,
    { get: jest.fn().mockReturnValue("15m") } as never,
  );
  return { service, prisma, audit };
}
describe("Individual learner usernames", () => {
  it("normalises and validates memorable usernames while retaining older registration clients", async () => {
    const dto = plainToInstance(RegisterIndependentStudentDto, {
      ...registration,
      username: " Sam.Jeptoo ",
    });
    expect(dto.username).toBe("sam.jeptoo");
    expect(await validate(dto)).toEqual([]);
    const { username, ...legacy } = registration;
    expect(
      await validate(plainToInstance(RegisterIndependentStudentDto, legacy)),
    ).toEqual([]);
    for (const username of [
      "ab",
      "7sam",
      "sam jeptoo",
      "sam@example.com",
      "sam/jeptoo",
      "a".repeat(31),
      33,
    ])
      expect(
        (
          await validate(
            plainToInstance(RegisterIndependentStudentDto, {
              ...registration,
              username,
            }),
          )
        ).some((e) => e.property === "username"),
      ).toBe(true);
  });
  it("stores a unique case-normalised login in both user and student profile without changing identity or trial access", async () => {
    const { service, prisma } = setup();
    const result = await service.registerIndependentStudent(registration);
    expect(result).toMatchObject({
      studentId: 42,
      username: "sam.jeptoo",
      admissionNumber: "SAM.JEPTOO",
      requiresPayment: true,
    });
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      schoolId: 8,
      role: Role.STUDENT,
      isIndependentTrial: true,
      grade: "Grade 11",
      admissionNumber: "SAM.JEPTOO",
      studentProfile: { create: { admissionNumber: "SAM.JEPTOO" } },
    });
    expect(await bcrypt.compare(registration.password, data.passwordHash)).toBe(
      true,
    );
    expect(data.passwordHash).not.toBe(registration.password);
  });
  it("rejects names already taken, including collisions with an existing legacy login", async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 90 });
    await expect(
      service.registerIndependentStudent({
        ...registration,
        username: "SaM.JePtOo",
      }),
    ).rejects.toThrow("username is already taken");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        schoolId_admissionNumber: {
          schoolId: 8,
          admissionNumber: "SAM.JEPTOO",
        },
      },
      select: { id: true },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("handles simultaneous username claims as conflicts rather than server errors", async () => {
    const { service, prisma } = setup();
    prisma.user.create.mockRejectedValue({ code: "P2002" });
    await expect(
      service.registerIndependentStudent(registration),
    ).rejects.toThrow("already in use");
  });
  it("continues to allocate an ID to older clients that do not supply a username", async () => {
    const { service } = setup();
    const { username, ...legacy } = registration;
    const result = await service.registerIndependentStudent(legacy);
    expect(result.username).toBeNull();
    expect(result.admissionNumber).toMatch(
      /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/,
    );
  });
  it("accepts username casing, legacy IDs and email through the same password-protected independent login", async () => {
    const { service, prisma } = setup();
    const hash = await bcrypt.hash(registration.password, 4);
    prisma.user.findFirst.mockResolvedValue({
      id: 42,
      schoolId: 8,
      role: Role.STUDENT,
      name: "Sam Jeptoo",
      admissionNumber: "SAM.JEPTOO",
      passwordHash: hash,
      isActive: true,
      isIndependentTrial: true,
      subscriptionExpiresAt: null,
    });
    for (const identifier of [" sam.JEPTOO ", "AB2C", "Parent@Example.com"]) {
      const result = await service.loginIndependentStudent({
        identifier,
        password: registration.password,
      });
      expect(result.accessToken).toBe("token");
      expect(prisma.user.findFirst).toHaveBeenLastCalledWith({
        where: {
          schoolId: 8,
          role: Role.STUDENT,
          OR: [
            { admissionNumber: identifier.trim().toUpperCase() },
            { email: identifier.trim().toLowerCase() },
          ],
        },
      });
    }
    await expect(
      service.loginIndependentStudent({
        identifier: "sam.jeptoo",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid credentials");
  });
});
