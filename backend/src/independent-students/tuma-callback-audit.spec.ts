import { TumaCallbackQueue } from "./tuma-callback-queue";

describe("Tuma callback raw audit", () => {
  it("commits exact bytes before parsing; preserves evidence if parsing fails", async () => {
    const order: string[] = [];
    const raw = Buffer.from('{ "status" : "unexpected", "extra": 1 }\n');
    const db: any = {
      mpesaRawCallbackEvent: {
        createMany: jest.fn(async () => {
          order.push("event");
        }),
      },
      payment: {
        updateMany: jest.fn(async () => {
          order.push("raw");
        }),
      },
    };
    const payments: any = {
      authenticateCallback: jest.fn().mockResolvedValue({ id: 42 }),
      validateCallback: jest.fn(async () => {
        order.push("validate");
        throw new Error("invalid");
      }),
    };
    const queue = new TumaCallbackQueue(db, payments);
    await expect(queue.enqueue("ref", "token", {}, raw)).rejects.toThrow(
      "invalid",
    );
    expect(order).toEqual(["event", "raw", "validate"]);
    expect(db.payment.updateMany).toHaveBeenCalledWith({
      where: { legacy_tuma_id: 42, raw_payload: null },
      data: { raw_payload: raw.toString("utf8") },
    });
    expect(
      db.mpesaRawCallbackEvent.createMany.mock.calls[0][0].data[0].raw_payload,
    ).toBe(raw.toString("utf8"));
  });
  it("does not permit unauthenticated audit poisoning", async () => {
    const db: any = {
      payment: { updateMany: jest.fn() },
      mpesaRawCallbackEvent: { createMany: jest.fn() },
    };
    const payments: any = {
      authenticateCallback: jest
        .fn()
        .mockRejectedValue(new Error("forged token")),
    };
    await expect(
      new TumaCallbackQueue(db, payments).enqueue(
        "ref",
        "bad",
        {},
        Buffer.from("{}"),
      ),
    ).rejects.toThrow();
    expect(db.payment.updateMany).not.toHaveBeenCalled();
    expect(db.mpesaRawCallbackEvent.createMany).not.toHaveBeenCalled();
  });
});
