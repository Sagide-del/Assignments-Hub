import { JengaPaymentsService } from "./jenga-payments.service";

function setup() {
  const payment: any = {
    id: 1,
    studentId: 42,
    reference: "INV001",
    idempotencyKey: "42:key",
    amountKES: 300,
    phone: "254708374149",
    interval: "MONTHLY",
    status: "PROCESSING",
    receiptNumber: null,
    expiresAt: new Date(Date.now() + 600000),
    paidAt: null,
    failureReason: null,
  };
  const student: any = {
    id: 42,
    name: "Learner",
    subscriptionExpiresAt: null,
    isActive: false,
    isIndependentTrial: true,
  };
  const invoices: any[] = [];
  const prisma: any = {
    independentJengaPayment: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.reference === payment.reference) return payment;
        if (where.receiptNumber && where.receiptNumber === payment.receiptNumber)
          return payment;
        return null;
      }),
      findUniqueOrThrow: jest.fn(async () => payment),
      update: jest.fn(async ({ data }) => Object.assign(payment, data)),
    },
    user: {
      findUniqueOrThrow: jest.fn(async () => student),
      update: jest.fn(async ({ data }) => Object.assign(student, data)),
    },
    independentStudentInvoice: {
      create: jest.fn(async ({ data }) => {
        invoices.push(data);
        return data;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  prisma.$transaction = async (operation: (tx: typeof prisma) => unknown) =>
    operation(prisma);
  const service = new JengaPaymentsService(
    prisma,
    { isConfigured: () => true } as any,
    { getPaymentInfo: () => ({ monthlyAmountKES: 300, annualAmountKES: 3600 }) } as any,
  );
  return { service, payment, student, invoices };
}

describe("Jenga payment callback settlement", () => {
  it("activates an independent subscription for code 3 exactly once", async () => {
    const { service, payment, student, invoices } = setup();
    const callback = {
      code: 3,
      reference: "INV001",
      transactionReference: "INV001",
      telcoReference: "TQWERTY123",
      requestAmount: "300",
      mobileNumber: "254708374149",
    };

    await expect(service.handleCallback(callback)).resolves.toEqual({
      received: true,
      duplicate: false,
    });
    expect(payment.status).toBe("CONFIRMED");
    expect(payment.receiptNumber).toBe("TQWERTY123");
    expect(student.isActive).toBe(true);
    expect(student.isIndependentTrial).toBe(false);
    expect(invoices).toHaveLength(1);
  });

  it("does not activate a subscription for failure code 1", async () => {
    const { service, payment, student, invoices } = setup();
    await expect(
      service.handleCallback({ code: 1, reference: "INV001" }),
    ).resolves.toEqual({ received: true, duplicate: false });

    expect(payment.status).toBe("FAILED");
    expect(student.isActive).toBe(false);
    expect(student.isIndependentTrial).toBe(true);
    expect(invoices).toHaveLength(0);
  });
});
