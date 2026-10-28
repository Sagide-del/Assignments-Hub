import "reflect-metadata";
import {
  BadGatewayException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { TumaPaymentsService, tumaPeriodEnd } from "./tuma-payments.service";
import { StartTumaPaymentDto } from "./dto/start-tuma-payment.dto";
import { normalizeMpesaPhone } from "./tuma-payment.provider";
import { Role } from "../common/enums/role.enum";
const actor = {
  id: 42,
  schoolId: 1,
  role: Role.STUDENT,
  name: "Learner",
  email: null,
  admissionNumber: null,
  grade: "Grade 9",
  isIndependentTrial: true,
};
const dto = {
  phone: "0712 345 678",
  interval: "MONTHLY" as const,
  idempotencyKey: "aaaaaaaa-1234-4567-8888-aaaaaaaaaaaa",
};
function setup() {
  const rows: any[] = [],
    invoices: any[] = [],
    users = new Map<number, any>([
      [
        42,
        {
          id: 42,
          name: "Learner",
          role: "STUDENT",
          school: { code: "INDEPENDENT" },
          isIndependentTrial: true,
          subscriptionExpiresAt: null,
        },
      ],
      [
        43,
        {
          id: 43,
          name: "School learner",
          role: "STUDENT",
          school: { code: "SCHOOL" },
          isIndependentTrial: false,
        },
      ],
      [
        44,
        {
          id: 44,
          name: "Other learner",
          role: "STUDENT",
          school: { code: "INDEPENDENT" },
          isIndependentTrial: true,
          subscriptionExpiresAt: null,
        },
      ],
    ]);
  const matches = (r: any, w: any) =>
    Object.entries(w ?? {}).every(([k, v]: [string, any]) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? v.in
          ? v.in.includes(r[k])
          : v.not !== undefined
            ? r[k] !== v.not
            : v.lte
              ? r[k] <= v.lte
              : false
        : r[k] === v,
    );
  const ledger = {
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn(
      async ({ where }) => rows.find((p) => matches(p, where)) ?? null,
    ),
    findUniqueOrThrow: jest.fn(async ({ where }) => {
      const row = rows.find((p) => matches(p, where));
      if (!row) throw Error("Not found");
      return row;
    }),
    findFirst: jest.fn(
      async ({ where }) =>
        [...rows].reverse().find((p) => matches(p, where)) ?? null,
    ),
    create: jest.fn(async ({ data }) => {
      const row = {
        id: rows.length + 1,
        status: "PENDING",
        checkoutRequestId: null,
        merchantRequestId: null,
        receiptNumber: null,
        callbackPayload: null,
        failureReason: null,
        paidAt: null,
        createdAt: new Date(),
        ...data,
      };
      rows.push(row);
      return { ...row };
    }),
    update: jest.fn(async ({ where, data }) => {
      const r = rows.find((p) => matches(p, where));
      if (
        data.receiptNumber &&
        rows.some(
          (p) => p.id !== r.id && p.receiptNumber === data.receiptNumber,
        )
      )
        throw Error("Unique receipt");
      Object.assign(r, data);
      return { ...r };
    }),
    updateMany: jest.fn(async ({ where, data }) => {
      const found = rows.filter((r) => matches(r, where));
      found.forEach((r) => Object.assign(r, data));
      return { count: found.length };
    }),
  };
  const prisma: any = {
    independentTumaPayment: ledger,
    user: {
      findUnique: jest.fn(async ({ where }) => users.get(where.id)),
      findUniqueOrThrow: jest.fn(async ({ where }) => users.get(where.id)),
      update: jest.fn(async ({ where, data }) =>
        Object.assign(users.get(where.id), data),
      ),
    },
    independentStudentInvoice: {
      create: jest.fn(async ({ data }) => {
        invoices.push(data);
        return data;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  let previous = Promise.resolve();
  prisma.$transaction = jest.fn(async (fn) => {
    const wait = previous;
    let release: () => void = () => {};
    previous = new Promise<void>((r) => (release = r));
    await wait;
    const snapshots = rows.map((r) => ({ ...r })),
      userSnapshots = [...users].map(([id, u]) => [id, { ...u }] as const),
      invoiceLength = invoices.length;
    try {
      return await fn(prisma);
    } catch (e) {
      rows.splice(0, rows.length, ...snapshots);
      users.clear();
      userSnapshots.forEach(([id, u]) => users.set(id, u));
      invoices.splice(invoiceLength);
      throw e;
    } finally {
      release();
    }
  });
  const provider = {
    isConfigured: jest.fn(() => true),
    callbackBase: () =>
      "https://api.example/api/v1/independent-students/tuma/callback",
    initiate: jest.fn(async (input: any) => ({
      checkoutRequestId: `checkout-${input.reference}`,
      merchantRequestId: `merchant-${input.reference}`,
    })),
  };
  const service = new TumaPaymentsService(
    prisma,
    provider as any,
    {
      getPaymentInfo: () => ({ monthlyAmountKES: 250, annualAmountKES: 2500 }),
    } as any,
  );
  const callback = (row = rows[0], receipt = "UBNGT7QNYB") => ({
    status: "completed",
    merchant_request_id: row.merchantRequestId,
    checkout_request_id: row.checkoutRequestId,
    result_code: 0,
    amount: row.amountKES,
    mpesa_receipt_number: receipt,
  });
  const token = (index = 0) =>
    provider.initiate.mock.calls[index][0].callbackUrl.split("/").at(-1)!;
  return { rows, invoices, users, prisma, provider, service, callback, token };
}
describe("Individual Tuma STK payments", () => {
  it("normalizes Kenyan phone formats and rejects invalid numbers", () => {
    for (const value of [
      "0712345678",
      "+254712345678",
      "254712345678",
      "712345678",
    ])
      expect(normalizeMpesaPhone(value)).toBe("254712345678");
    expect(normalizeMpesaPhone("0112345678")).toBe("254112345678");
    for (const value of ["123", "+256712345678", "07123456789", "abc"])
      expect(normalizeMpesaPhone(value)).toBeNull();
  });
  it("uses server pricing and protects callback secrets from the student response", async () => {
    const { service, provider, rows } = setup();
    const p = await service.start(actor, { ...dto, amountKES: 1 } as any);
    expect(p.amountKES).toBe(250);
    expect(provider.initiate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 250, phone: "254712345678" }),
    );
    expect(JSON.stringify(p)).not.toContain("callback");
    expect(rows[0].callbackTokenHash).toHaveLength(64);
    expect(rows[0].callbackTokenHash).not.toBe(
      provider.initiate.mock.calls[0][0].callbackUrl.split("/").at(-1),
    );
  });
  it("deduplicates repeated requests and blocks another simultaneous prompt", async () => {
    const { service, provider } = setup();
    await service.start(actor, dto);
    await service.start(actor, dto);
    await service.start(actor, {
      ...dto,
      idempotencyKey: "bbbbbbbb-1234-4567-8888-bbbbbbbbbbbb",
    });
    expect(provider.initiate).toHaveBeenCalledTimes(1);
    await expect(
      service.start(actor, { ...dto, interval: "ANNUAL" }),
    ).rejects.toThrow("already used");
    await expect(
      service.start(actor, {
        ...dto,
        idempotencyKey: "cccccccc-1234-4567-8888-cccccccccccc",
        phone: "0799999999",
      }),
    ).rejects.toThrow("already pending");
  });
  it("rejects school accounts and unconfigured payments without contacting Tuma", async () => {
    const { service, provider } = setup();
    await expect(service.start({ ...actor, id: 43 }, dto)).rejects.toThrow(
      "independent",
    );
    provider.isConfigured.mockReturnValue(false);
    await expect(service.start(actor, dto)).rejects.toThrow("not configured");
    expect(provider.initiate).not.toHaveBeenCalled();
  });
  it("confirms payment and renews exactly once even for simultaneous duplicate callbacks", async () => {
    const { service, rows, token, callback, invoices, users } = setup();
    users.get(42).subscriptionExpiresAt = new Date("2030-01-31T12:00:00Z");
    await service.start(actor, dto);
    await Promise.all([
      service.callback(rows[0].reference, token(), callback()),
      service.callback(rows[0].reference, token(), callback()),
    ]);
    expect(invoices).toHaveLength(1);
    expect(rows[0].status).toBe("CONFIRMED");
    expect(users.get(42).isIndependentTrial).toBe(false);
    expect(users.get(42).subscriptionExpiresAt.toISOString()).toBe(
      "2030-02-28T12:00:00.000Z",
    );
    expect(invoices[0].mpesaCode).toBe("UBNGT7QNYB");
  });
  it("rejects forged tokens, wrong amounts, identifiers and incomplete success payloads", async () => {
    const { service, rows, token, callback, invoices, users } = setup();
    await service.start(actor, dto);
    await expect(
      service.callback(rows[0].reference, "0".repeat(64), callback()),
    ).rejects.toThrow("Invalid payment callback");
    for (const body of [
      { ...callback(), amount: 1 },
      { ...callback(), checkout_request_id: "wrong" },
      { ...callback(), merchant_request_id: "wrong" },
      { ...callback(), mpesa_receipt_number: undefined },
      { ...callback(), status: "failed" },
    ])
      await expect(
        service.callback(rows[0].reference, token(), body),
      ).rejects.toThrow();
    expect(invoices).toHaveLength(0);
    expect(users.get(42).isIndependentTrial).toBe(true);
  });
  it("captures a callback arriving before the initiation response and settles after IDs are stored", async () => {
    const { service, provider, rows, invoices } = setup();
    provider.initiate.mockImplementation(async (input: any) => {
      const ids = {
        checkoutRequestId: "early-checkout",
        merchantRequestId: "early-merchant",
      };
      await service.callback(
        rows[0].reference,
        input.callbackUrl.split("/").at(-1),
        {
          status: "completed",
          merchant_request_id: ids.merchantRequestId,
          checkout_request_id: ids.checkoutRequestId,
          result_code: 0,
          amount: 250,
          mpesa_receipt_number: "EARLY12345",
        },
      );
      return ids;
    });
    expect((await service.start(actor, dto)).status).toBe("CONFIRMED");
    expect(invoices).toHaveLength(1);
  });
  it("does not activate cancelled or failed requests, and does not revoke a confirmed payment", async () => {
    const { service, rows, token, callback, invoices } = setup();
    await service.start(actor, dto);
    await service.callback(rows[0].reference, token(), {
      ...callback(),
      status: "failed",
      result_code: 1032,
    });
    expect(rows[0].status).toBe("CANCELLED");
    expect(invoices).toHaveLength(0);
    await service.callback(rows[0].reference, token(), callback());
    await service.callback(rows[0].reference, token(), {
      ...callback(),
      status: "failed",
      result_code: 2001,
    });
    expect(rows[0].status).toBe("CONFIRMED");
    expect(invoices).toHaveLength(1);
  });
  it("leaves uncertain gateway responses unactivated and allows expiry recovery without deleting records", async () => {
    const { service, provider, rows, invoices } = setup();
    provider.initiate.mockRejectedValueOnce(new BadGatewayException("Timeout"));
    expect((await service.start(actor, dto)).status).toBe(
      "AWAITING_VERIFICATION",
    );
    expect(invoices).toHaveLength(0);
    rows[0].expiresAt = new Date(Date.now() - 1000);
    await service.start(actor, {
      ...dto,
      idempotencyKey: "dddddddd-1234-4567-8888-dddddddddddd",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe("AWAITING_VERIFICATION");
  });
  it("marks authentication failures failed without pretending a payment was confirmed", async () => {
    const { service, provider, invoices } = setup();
    provider.initiate.mockRejectedValue(
      new ServiceUnavailableException("Authentication failed"),
    );
    expect((await service.start(actor, dto)).status).toBe("FAILED");
    expect(invoices).toHaveLength(0);
  });
  it("prevents reusing a receipt for a different learner and scopes status to the current user", async () => {
    const { service, rows, token, callback, invoices, users } = setup();
    await service.start(actor, dto);
    await service.callback(rows[0].reference, token(), callback());
    await service.start({ ...actor, id: 44 }, dto);
    await expect(
      service.callback(rows[1].reference, token(1), callback(rows[1])),
    ).rejects.toThrow("Unique receipt");
    expect(users.get(44).isIndependentTrial).toBe(true);
    expect(invoices).toHaveLength(1);
    expect((await service.latest({ ...actor, id: 44 }))?.reference).toBe(
      rows[1].reference,
    );
  });
  it("does not silently confirm expired prompts and validates bounded initiation input", async () => {
    const { service, rows } = setup();
    await service.start(actor, dto);
    rows[0].expiresAt = new Date(Date.now() - 1);
    expect((await service.latest(actor))?.status).toBe("AWAITING_VERIFICATION");
    expect(await validate(plainToInstance(StartTumaPaymentDto, dto))).toEqual(
      [],
    );
    expect(
      (
        await validate(
          plainToInstance(StartTumaPaymentDto, {
            ...dto,
            idempotencyKey: "short",
            interval: "FREE",
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it("clamps calendar renewal dates instead of overflowing month ends", () => {
    expect(
      tumaPeriodEnd(new Date("2028-02-29T12:00:00Z"), "ANNUAL").toISOString(),
    ).toBe("2029-02-28T12:00:00.000Z");
    expect(
      tumaPeriodEnd(new Date("2026-12-31T12:00:00Z"), "MONTHLY").toISOString(),
    ).toBe("2027-01-31T12:00:00.000Z");
  });
});
