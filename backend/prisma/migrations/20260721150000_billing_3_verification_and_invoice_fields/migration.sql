ALTER TABLE "payment_transactions"
ADD COLUMN "verified_by_id" INTEGER,
ADD COLUMN "verified_at" TIMESTAMP(3),
ADD COLUMN "rejected_at" TIMESTAMP(3),
ADD COLUMN "rejection_reason" TEXT;

ALTER TABLE "invoices"
ADD COLUMN "payment_method" "PaymentMethod",
ADD COLUMN "pdf_path" TEXT;

ALTER TABLE "payment_provider_configs"
ADD COLUMN "instructions" TEXT;

CREATE INDEX "payment_transactions_verified_by_id_idx" ON "payment_transactions"("verified_by_id");

ALTER TABLE "payment_transactions"
ADD CONSTRAINT "payment_transactions_verified_by_id_fkey"
FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
