import { computeAnnualPriceKES, PLAN_TIERS } from "../common/config/plans";
import { PaymentService } from "./payment.service";
import { IndependentStudentsService } from "../independent-students/independent-students.service";
import { Role } from "../common/enums/role.enum";
describe("Current subscription pricing", () => {
  it("charges all school sizes/types at KES 200 per learner per year without free or monthly tiers", () => {
    expect(PLAN_TIERS).toHaveLength(1);
    for (const count of [1, 49, 50, 200, 201, 500, 1501])
      for (const type of ["DAY", "BOARDING"] as const) {
        expect(computeAnnualPriceKES(count, type)).toMatchObject({
          interval: "ANNUAL",
          ratePerStudent: 200,
          amountKES: count * 200,
        });
      }
    expect(() => computeAnnualPriceKES(1.5, "DAY")).toThrow();
  });
  it("enforces KES 300/month for individuals even when old overrides are configured", () => {
    const service = new IndependentStudentsService(
      {} as any,
      {} as any,
      {
        get: (key: string) => (key.includes("PRICE") ? "150" : undefined),
      } as any,
      {} as any,
    );
    expect(service.getPaymentInfo()).toMatchObject({
      monthlyAmountKES: 300,
      annualAmountKES: 3600,
    });
  });
  it("creates an annual school invoice and matching transaction from the live learner count", async () => {
    const invoices: any[] = [];
    const p: any = {
      school: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            type: "DAY",
            name: "Test school",
            code: "TEST",
          }),
      },
      user: { count: jest.fn().mockResolvedValue(120) },
      invoice: {
        create: jest.fn(async ({ data }) => {
          invoices.push(data);
          return { id: 1, ...data };
        }),
      },
      paymentTransaction: {
        create: jest.fn(async ({ data }) => ({ id: 2, ...data })),
        update: jest.fn(async ({ data }) => ({ id: 2, ...data })),
      },
    };
    p.$transaction = jest.fn((fn) => fn(p));
    const service = new PaymentService(
      { get: () => "test" } as any,
      p,
      {} as any,
      {} as any,
      {} as any,
    );
    jest
      .spyOn(service as any, "getProviderConfig")
      .mockResolvedValue({
        method: "EQUITY_PAYBILL",
        isActive: true,
        configuration: {},
      });
    await service.createEquityPaybillPayment(
      { id: 1, schoolId: 1, role: Role.SCHOOL_ADMIN } as any,
      {
        payerName: "School",
        payerPhone: "0712345678",
        paymentReference: "BANK-1",
        interval: "annual",
      },
    );
    expect(invoices[0]).toMatchObject({
      interval: "ANNUAL",
      amountKES: 24000,
      studentCountSnapshot: 120,
      planSnapshot: "School Annual",
    });
    const duration =
      invoices[0].dueAt.getTime() - invoices[0].issuedAt.getTime();
    expect(duration).toBeGreaterThan(364 * 86400000);
    await expect(
      service.createSubscription("school@example.test", 1, "monthly"),
    ).rejects.toThrow("annually");
  });
});
