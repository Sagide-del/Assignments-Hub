import { QuestionBankService } from "./question-bank.service";
import { Role } from "../common/enums/role.enum";
describe("Subscribed-school question bank access", () => {
  function setup(subscription: any, active = true) {
    const prisma = {
      subscription: { findFirst: jest.fn().mockResolvedValue(subscription) },
      schoolQuestionBankAccess: {
        findUnique: jest.fn().mockResolvedValue({ active }),
      },
      questionBank: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockImplementation((rows) => Promise.all(rows)),
    };
    return {
      prisma,
      service: new QuestionBankService(
        prisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      ),
    };
  }
  const actor = { id: 1, role: Role.TEACHER, schoolId: 2 } as any;
  it("requires both a live active subscription and bank activation", async () => {
    for (const sub of [
      null,
      { status: "PAST_DUE" },
      { status: "ACTIVE", expiresAt: new Date(0) },
    ]) {
      const { service } = setup(sub);
      await expect(service.browse(actor, {})).rejects.toThrow("subscription");
    }
    const off = setup({ status: "ACTIVE" }, false);
    await expect(off.service.browse(actor, {})).rejects.toThrow("activated");
    const on = setup({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 86400000),
    });
    expect(await on.service.browse(actor, {})).toMatchObject({ total: 0 });
  });
});
