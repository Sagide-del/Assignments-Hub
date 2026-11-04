import { TumaReconciliationService } from "./tuma-reconciliation.service";

describe("Tuma reconciliation", () => {
  const row = {
    id: "payment-1",
    legacy_tuma_id: 1,
    checkout_request_id: "checkout-1",
  };
  let db: any, provider: any, payments: any, job: TumaReconciliationService;
  beforeEach(() => {
    db = {
      payment: {
        findMany: jest.fn().mockResolvedValue([row]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
      },
      independentTumaPayment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ reference: "AH123" }),
      },
    };
    provider = {
      statusQueryConfigured: jest.fn().mockReturnValue(true),
      queryTransactionStatus: jest
        .fn()
        .mockResolvedValue({ payload: { result_code: 0 } }),
    };
    payments = {
      processStoredCallback: jest.fn().mockResolvedValue(undefined),
    };
    job = new TumaReconciliationService(db, provider, payments);
  });
  it("selects only pending payments older than 15 minutes and uses shared settlement", async () => {
    const start = Date.now();
    await job.reconcile();
    const where = db.payment.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("PENDING");
    expect(where.created_at.lt.getTime()).toBeGreaterThanOrEqual(
      start - 900000,
    );
    expect(where.created_at.lt.getTime()).toBeLessThanOrEqual(
      Date.now() - 900000,
    );
    expect(provider.queryTransactionStatus).toHaveBeenCalledWith("checkout-1");
    expect(payments.processStoredCallback).toHaveBeenCalledWith("AH123", {
      result_code: 0,
    });
  });
  it("does not query or activate when the vendor contract is unavailable", async () => {
    provider.statusQueryConfigured.mockReturnValue(false);
    await job.reconcile();
    expect(provider.queryTransactionStatus).not.toHaveBeenCalled();
    expect(db.payment.updateMany).not.toHaveBeenCalled();
    expect(payments.processStoredCallback).not.toHaveBeenCalled();
  });
  it("honours another replica's lease", async () => {
    db.payment.updateMany.mockResolvedValue({ count: 0 });
    await job.reconcile();
    expect(provider.queryTransactionStatus).not.toHaveBeenCalled();
  });
  it("leaves payment unchanged on unknown status or network errors", async () => {
    provider.queryTransactionStatus.mockRejectedValue(new Error("timeout"));
    await job.reconcile();
    expect(payments.processStoredCallback).not.toHaveBeenCalled();
    expect(db.payment.updateMany.mock.calls[0][0].data).not.toHaveProperty(
      "status",
    );
  });
  it("does not fabricate checkout IDs", async () => {
    db.payment.findMany.mockResolvedValue([
      { ...row, checkout_request_id: null },
    ]);
    await job.reconcile();
    expect(provider.queryTransactionStatus).not.toHaveBeenCalled();
  });
  it.each(["FAILED", "CANCELLED"])(
    "uses the same settlement path for %s",
    async (status) => {
      provider.queryTransactionStatus.mockResolvedValue({
        payload: { result_code: status === "CANCELLED" ? 1032 : 1037 },
      });
      db.payment.findUniqueOrThrow.mockResolvedValue({ status });
      await job.reconcile();
      expect(payments.processStoredCallback).toHaveBeenCalledTimes(1);
    },
  );
});
