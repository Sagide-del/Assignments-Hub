CREATE TABLE "question_generation_batches" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_generation_batches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_generation_batches_key_key" ON "question_generation_batches"("key");
ALTER TABLE "question_bank" ADD COLUMN "batch_id" INTEGER;
-- Reassemble the existing per-15-question retry chunks into generation runs.
-- Older content without a correlation key is retained in one legacy batch.
INSERT INTO "question_generation_batches" ("key", "createdAt")
SELECT COALESCE(regexp_replace("generation_batch_id", ':[0-9]+$', ''), 'legacy'), MIN("createdAt")
FROM "question_bank"
WHERE "is_global" = true
GROUP BY COALESCE(regexp_replace("generation_batch_id", ':[0-9]+$', ''), 'legacy')
ORDER BY MIN("createdAt"), COALESCE(regexp_replace("generation_batch_id", ':[0-9]+$', ''), 'legacy');
UPDATE "question_bank" q
SET "batch_id" = b."id"
FROM "question_generation_batches" b
WHERE q."is_global" = true
AND b."key" = COALESCE(regexp_replace(q."generation_batch_id", ':[0-9]+$', ''), 'legacy');
CREATE INDEX "question_bank_batch_id_idx" ON "question_bank"("batch_id");
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "question_generation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
