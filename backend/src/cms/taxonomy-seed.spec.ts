import { createHash } from "crypto";
import { seedTaxonomy, TAXONOMY_SEED } from "../scripts/seed-taxonomy";

describe("Append-only taxonomy seeding", () => {
  it("adds the missing 44 rows, preserves all existing edits and IDs, and skips every row on rerun", async () => {
    const store = new Map<string, any>();
    const idFor = (row: (typeof TAXONOMY_SEED)[number]) =>
      createHash("sha256")
        .update(
          JSON.stringify([
            "supplied-taxonomy-v1",
            row.grade,
            row.pathway,
            row.track,
            row.subject,
          ]),
        )
        .digest("hex");
    for (const row of TAXONOMY_SEED.slice(0, 83)) {
      const id = store.size === 0 ? "curated-import-id" : idFor(row);
      store.set(id, {
        ...structuredClone(row),
        id,
        verified: false,
        source: "USER_PROVIDED",
        updated_at: "unchanged",
      });
    }
    store.get("curated-import-id").topics = ["Administrator-edited topic"];
    const before = structuredClone([...store]);
    const tx = {
      curriculumTaxonomy: {
        findFirst: jest.fn(
          async ({ where }) =>
            [...store.values()].find((row) =>
              where.OR.some((clause: any) =>
                Object.entries(clause).every(
                  ([key, value]) => row[key] === value,
                ),
              ),
            ) ?? null,
        ),
        upsert: jest.fn(async ({ where, create, update }) => {
          const row = store.get(where.id);
          const saved = row ? { ...row, ...update } : structuredClone(create);
          store.set(where.id, saved);
          return saved;
        }),
      },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(await seedTaxonomy(prisma as any)).toEqual({
        created: 44,
        updated: 0,
        skipped: 83,
      });
      expect(store.size).toBe(127);
      for (const [id, row] of before) expect(store.get(id)).toEqual(row);
      expect(tx.curriculumTaxonomy.upsert).toHaveBeenCalledTimes(44);
      expect(
        tx.curriculumTaxonomy.upsert.mock.calls.every(
          ([args]) => Object.keys(args.update).length === 0,
        ),
      ).toBe(true);
      expect(await seedTaxonomy(prisma as any)).toEqual({
        created: 0,
        updated: 0,
        skipped: 127,
      });
      expect(store.size).toBe(127);
      for (const [id, row] of before) expect(store.get(id)).toEqual(row);
      expect(
        [...new Set([...store.values()].map((row) => row.grade))].sort(
          (a, b) => a - b,
        ),
      ).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    } finally {
      log.mockRestore();
    }
  });
});
