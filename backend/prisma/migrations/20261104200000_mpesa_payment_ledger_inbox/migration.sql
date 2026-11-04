-- CreateEnum
CREATE TYPE "MpesaLedgerStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "checkout_request_id" TEXT,
    "mpesa_receipt" TEXT,
    "status" "MpesaLedgerStatus" NOT NULL DEFAULT 'PENDING',
    "legacy_tuma_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MpesaCallbackInbox" (
    "id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MpesaCallbackInbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkout_request_id_key" ON "Payment"("checkout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpesa_receipt_key" ON "Payment"("mpesa_receipt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_legacy_tuma_id_key" ON "Payment"("legacy_tuma_id");

-- CreateIndex
CREATE INDEX "Payment_user_id_status_idx" ON "Payment"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaCallbackInbox_event_key_key" ON "MpesaCallbackInbox"("event_key");

-- CreateIndex
CREATE INDEX "MpesaCallbackInbox_processed_at_next_attempt_at_idx" ON "MpesaCallbackInbox"("processed_at", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Retain existing orders and backfill the financial ledger without reactivation.
INSERT INTO "Payment" ("id","user_id","amount","phone","checkout_request_id","mpesa_receipt","status","legacy_tuma_id","created_at","updated_at")
SELECT 'legacy-tuma-' || "id"::text, "student_id", "amount_kes", "phone", "checkout_request_id", "receipt_number",
  CASE WHEN "status"='CONFIRMED' THEN 'SUCCESS'::"MpesaLedgerStatus"
       WHEN "status" IN ('FAILED','CANCELLED','REJECTED') THEN 'FAILED'::"MpesaLedgerStatus"
       ELSE 'PENDING'::"MpesaLedgerStatus" END,
  "id", "created_at", "updated_at"
FROM "independent_tuma_payments"
ON CONFLICT ("legacy_tuma_id") DO NOTHING;
