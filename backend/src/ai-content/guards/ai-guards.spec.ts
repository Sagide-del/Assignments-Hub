import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AiFeature } from "@prisma/client";
import { Role } from "../../common/enums/role.enum";
import { AiFeatureGuard } from "./ai-feature.guard";
import { AiQuotaGuard } from "./ai-quota.guard";

function contextWithUser(user?: object) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe("AI guards", () => {
  const actor = {
    id: 1,
    schoolId: 22,
    role: Role.TEACHER,
    name: "Teacher",
    email: null,
    admissionNumber: null,
    grade: null,
  };

  it("AiFeatureGuard delegates the school and feature checks", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(AiFeature.ASSIGNMENT_DRAFT),
    };
    const featureConfig = { assertEnabled: jest.fn().mockResolvedValue({}) };
    const guard = new AiFeatureGuard(
      reflector as unknown as Reflector,
      featureConfig as never,
    );

    await expect(guard.canActivate(contextWithUser(actor))).resolves.toBe(true);
    expect(featureConfig.assertEnabled).toHaveBeenCalledWith(
      actor,
      AiFeature.ASSIGNMENT_DRAFT,
    );
  });

  it("AiFeatureGuard rejects requests without an authenticated actor", async () => {
    const guard = new AiFeatureGuard(
      { getAllAndOverride: jest.fn() } as unknown as Reflector,
      { assertEnabled: jest.fn() } as never,
    );

    await expect(guard.canActivate(contextWithUser())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("AiQuotaGuard enforces quota before generation", async () => {
    const quota = { assertAvailable: jest.fn().mockResolvedValue({}) };
    const guard = new AiQuotaGuard(quota as never);

    await expect(guard.canActivate(contextWithUser(actor))).resolves.toBe(true);
    expect(quota.assertAvailable).toHaveBeenCalledWith(actor);
  });
});
