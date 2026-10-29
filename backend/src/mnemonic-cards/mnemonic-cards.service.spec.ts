import { MnemonicCardsService } from "./mnemonic-cards.service";
import { Role } from "../common/enums/role.enum";
const actor = { id: 1, role: Role.STUDENT, grade: "Grade8" } as any;
describe("Native mnemonic cards", () => {
  it("exposes only published grade-matched or shared cards and fails closed when grade is absent", async () => {
    const prisma = {
      mnemonicCard: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new MnemonicCardsService(prisma as any);
    await service.findAll(actor);
    expect(prisma.mnemonicCard.findMany.mock.calls[0][0].where).toMatchObject({
      isPublished: true,
      OR: [{ grade: null }, { grade: { in: ["Grade8", "Grade 8"] } }],
    });
    await service.findAll({ ...actor, grade: null });
    expect(prisma.mnemonicCard.findMany.mock.calls[1][0].where.id).toBe(-1);
  });
  it("rejects publishing incomplete generated cards and validates edits before storage", async () => {
    const prisma = {
      mnemonicCard: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            content: { cue: "bad" },
            sourceDocumentId: 2,
          }),
        update: jest.fn(),
      },
    };
    const service = new MnemonicCardsService(prisma as any);
    await expect(service.update(1, { isPublished: true })).rejects.toThrow(
      "incomplete",
    );
    expect(prisma.mnemonicCard.update).not.toHaveBeenCalled();
  });
});
