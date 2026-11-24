import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { Role } from "../common/enums/role.enum";
import {
  IntasendPaymentsService,
  intasendPeriodEnd,
} from "../independent-students/intasend-payments.service";
const run = process.env.INTASEND_TEST_DATABASE_URL ? describe : describe.skip;
run("IntaSend on isolated migrated PostgreSQL; provider calls mocked", () => {
  let db: PrismaClient,
    student: any,
    actor: any,
    service: IntasendPaymentsService,
    provider: any,
    remote: any,
    reference: string,
    invoiceId: string;
  beforeAll(async () => {
    const url = new URL(process.env.INTASEND_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/intasend_test")
      throw Error("Disposable localhost intasend_test only.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await db.$connect();
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  beforeEach(async () => {
    const school = await db.school.upsert({
      where: { code: "INDEPENDENT" },
      create: { code: "INDEPENDENT", name: "Independent fixture" },
      update: {},
    });
    student = await db.user.create({
      data: {
        schoolId: school.id,
        name: "IntaSend fixture " + randomUUID(),
        role: "STUDENT",
        isIndependentTrial: true,
        isActive: false,
      },
    });
    actor = {
      id: student.id,
      schoolId: school.id,
      role: Role.STUDENT,
      name: student.name,
    };
    reference = "";
    invoiceId = randomUUID();
    remote = undefined;
    provider = {
      assertEnabled: jest.fn(),
      isConfigured: () => true,
      isLive: () => true,
      validChallenge: (p: any) => p?.challenge === "test-challenge",
      initiate: jest.fn(async (i: any) => {
        reference = i.reference;
        remote = {
          invoice: {
            invoice_id: invoiceId,
            api_ref: reference,
            state: "PROCESSING",
            value: 300,
            currency: "KES",
          },
        };
        return { invoiceId };
      }),
      status: jest.fn(async () => remote),
    };
    service = new IntasendPaymentsService(db as any, provider, {
      getPaymentInfo: () => ({ monthlyAmountKES: 300, annualAmountKES: 3600 }),
    } as any);
  });
  afterEach(async () => {
    await db.paymentWebhookEvent.deleteMany({
      where: { eventType: "INDEPENDENT_INTASEND" },
    });
    await db.independentIntasendPayment.deleteMany({
      where: { studentId: student.id },
    });
    await db.user.delete({ where: { id: student.id } });
  });
  const start = async (
    s: IntasendPaymentsService,
    a: any,
    key = randomUUID(),
  ) =>
    s.start(a, {
      phone: "0712345678",
      interval: "MONTHLY",
      idempotencyKey: key,
    });
  const complete = () => {
    remote.invoice.state = "COMPLETE";
  };
  it("server quotes 300 KES, normalizes phone and retries one request without duplicate STK", async () => {
    const key = randomUUID();
    const [a, b] = await Promise.all([
      start(service, actor, key),
      start(service, actor, key),
    ]);
    expect(a.reference).toBe(b.reference);
    expect(provider.initiate).toHaveBeenCalledTimes(1);
    expect(provider.initiate.mock.calls[0][0]).toMatchObject({
      amount: 300,
      phone: "254712345678",
    });
    expect(
      await db.independentIntasendPayment.count({
        where: { studentId: student.id },
      }),
    ).toBe(1);
    await expect(
      service.start(actor, {
        phone: "0799999999",
        interval: "MONTHLY",
        idempotencyKey: key,
      }),
    ).rejects.toThrow("different phone");
  });
  it("refuses a school account and unknown learners", async () => {
    await db.user.update({
      where: { id: student.id },
      data: { role: "TEACHER" },
    });
    await expect(start(service, actor)).rejects.toThrow("independent learners");
    expect(provider.initiate).not.toHaveBeenCalled();
  });
  it("simultaneous success, duplicate callbacks and late failures activate and invoice once", async () => {
    await start(service, actor);
    complete();
    await Promise.all([
      service.verify(reference, invoiceId),
      service.verify(reference, invoiceId),
    ]);
    const paid = await db.user.findUniqueOrThrow({ where: { id: student.id } }),
      end = paid.subscriptionExpiresAt;
    expect(paid.isIndependentTrial).toBe(false);
    expect(paid.isActive).toBe(true);
    expect(
      await db.independentStudentInvoice.count({
        where: { studentId: student.id },
      }),
    ).toBe(1);
    remote.invoice.state = "FAILED";
    await service.verify(reference, invoiceId);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
        .subscriptionExpiresAt,
    ).toEqual(end);
    expect(
      (
        await db.independentIntasendPayment.findUniqueOrThrow({
          where: { reference },
        })
      ).status,
    ).toBe("CONFIRMED");
  });
  it.each(["amount", "currency", "reference", "invoice"])(
    "rejects mismatched %s without granting access",
    async (field) => {
      await start(service, actor);
      complete();
      if (field === "amount") remote.invoice.value = 1;
      if (field === "currency") remote.invoice.currency = "USD";
      if (field === "reference") remote.invoice.api_ref = randomUUID();
      if (field === "invoice") remote.invoice.invoice_id = randomUUID();
      await expect(service.verify(reference, invoiceId)).rejects.toThrow(
        "does not match",
      );
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
          .isIndependentTrial,
      ).toBe(true);
      expect(
        await db.independentStudentInvoice.count({
          where: { studentId: student.id },
        }),
      ).toBe(0);
    },
  );
  it("never activates a production subscription from a sandbox completion", async () => {
    await start(service, actor);
    complete();
    provider.isLive = () => false;
    await service.verify(reference, invoiceId);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
        .isIndependentTrial,
    ).toBe(true);
    expect(
      (
        await db.independentIntasendPayment.findUniqueOrThrow({
          where: { reference },
        })
      ).status,
    ).toBe("AWAITING_VERIFICATION");
  });
  it("reconciles a missing callback through the status API", async () => {
    await start(service, actor);
    complete();
    await db.independentIntasendPayment.update({
      where: { reference },
      data: { updatedAt: new Date(Date.now() - 16 * 60000) },
    });
    await service.reconcile();
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
        .isIndependentTrial,
    ).toBe(false);
  });
  it("persists raw callback before verification and retries durable inbox after provider outage", async () => {
    await start(service, actor);
    const body = {
      challenge: "test-challenge",
      invoice_id: invoiceId,
      api_ref: reference,
      state: "COMPLETE",
      value: 1,
    };
    complete();
    provider.status.mockRejectedValue(Error("provider outage"));
    await expect(service.callback(body, JSON.stringify(body))).resolves.toEqual(
      { received: true },
    );
    const event = await db.paymentWebhookEvent.findFirstOrThrow({
      where: { eventType: "INDEPENDENT_INTASEND" },
    });
    expect((event.payload as any).raw).toBe(JSON.stringify(body));
    provider.status.mockResolvedValue(remote);
    await service.processEvent(event.id);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
        .isIndependentTrial,
    ).toBe(false);
    expect(
      (
        await db.paymentWebhookEvent.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processedAt,
    ).not.toBeNull();
  });
  it("invalid webhook challenge is rejected before queuing or activating", async () => {
    await start(service, actor);
    await expect(
      service.callback(
        { challenge: "wrong", api_ref: reference, invoice_id: invoiceId },
        "{}",
      ),
    ).rejects.toThrow("Invalid");
    expect(
      await db.paymentWebhookEvent.count({
        where: { eventType: "INDEPENDENT_INTASEND" },
      }),
    ).toBe(0);
  });
  it("invoices and account extension roll back atomically on database failure", async () => {
    await start(service, actor);
    complete();
    const transact = db.$transaction.bind(db);
    const failureDb: any = {
      independentIntasendPayment: db.independentIntasendPayment,
      $transaction: (fn: any) =>
        transact(async (tx: Prisma.TransactionClient) =>
          fn({
            $queryRaw: tx.$queryRaw.bind(tx),
            independentIntasendPayment: tx.independentIntasendPayment,
            independentStudentInvoice: tx.independentStudentInvoice,
            user: {
              findUniqueOrThrow: tx.user.findUniqueOrThrow.bind(tx.user),
              update: jest
                .fn()
                .mockRejectedValue(Error("simulated write failure")),
            },
          }),
        ),
    };
    const broken = new IntasendPaymentsService(failureDb, provider, {} as any);
    await expect(broken.verify(reference, invoiceId)).rejects.toThrow(
      "simulated write failure",
    );
    expect(
      await db.independentStudentInvoice.count({
        where: { studentId: student.id },
      }),
    ).toBe(0);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
        .isIndependentTrial,
    ).toBe(true);
  });
  it("expiry polling cannot overwrite a concurrent successful confirmation", async () => {
    await start(service, actor);
    await db.independentIntasendPayment.update({
      where: { reference },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    complete();
    const client: any = {
      user: db.user,
      independentIntasendPayment: {
        findFirst: async () => {
          const stale = await db.independentIntasendPayment.findUniqueOrThrow({
            where: { reference },
          });
          await service.verify(reference, invoiceId);
          return stale;
        },
        updateMany: db.independentIntasendPayment.updateMany.bind(
          db.independentIntasendPayment,
        ),
        findUniqueOrThrow: db.independentIntasendPayment.findUniqueOrThrow.bind(
          db.independentIntasendPayment,
        ),
      },
    };
    const offline = { ...provider, isConfigured: () => false };
    const poll = new IntasendPaymentsService(client, offline as any, {} as any);
    const result = await poll.latest(actor);
    expect(result?.status).toBe("CONFIRMED");
    expect(
      await db.independentStudentInvoice.count({
        where: { studentId: student.id },
      }),
    ).toBe(1);
  });
  it("a callback racing STK response cannot regress a confirmed payment to processing", async () => {
    provider.initiate.mockImplementation(async (i: any) => {
      reference = i.reference;
      remote = {
        invoice: {
          invoice_id: invoiceId,
          api_ref: reference,
          state: "COMPLETE",
          value: 300,
          currency: "KES",
        },
      };
      await service.verify(reference, invoiceId);
      return { invoiceId };
    });
    const p = await start(service, actor);
    expect(p.status).toBe("CONFIRMED");
    expect(
      await db.independentStudentInvoice.count({
        where: { studentId: student.id },
      }),
    ).toBe(1);
  });
});
it("subscription renewal clamps end-of-month and leap-year boundaries", () => {
  expect(
    intasendPeriodEnd(
      new Date("2027-01-31T08:00:00Z"),
      "MONTHLY",
    ).toISOString(),
  ).toBe("2027-02-28T08:00:00.000Z");
  expect(
    intasendPeriodEnd(new Date("2028-02-29T08:00:00Z"), "ANNUAL").toISOString(),
  ).toBe("2029-02-28T08:00:00.000Z");
});
