-- CreateEnum
CREATE TYPE "IndependentPaymentClaimStatus" AS ENUM (
    'AWAITING_VERIFICATION',
    'CONFIRMED',
    'REJECTED'
);

-- CreateTable
CREATE TABLE "independent_payment_claims" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
    "mpesa_code" TEXT NOT NULL,
    "payer_phone" TEXT,
    "status" "IndependentPaymentClaimStatus" NOT NULL DEFAULT 'AWAITING_VERIFICATION',
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "independent_payment_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "independent_payment_claims_mpesa_code_key"
ON "independent_payment_claims"("mpesa_code");

-- CreateIndex
CREATE INDEX "independent_payment_claims_student_id_status_idx"
ON "independent_payment_claims"("student_id", "status");

-- CreateIndex
CREATE INDEX "independent_payment_claims_status_created_at_idx"
ON "independent_payment_claims"("status", "created_at");

-- AddForeignKey
ALTER TABLE "independent_payment_claims"
ADD CONSTRAINT "independent_payment_claims_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "independent_payment_claims"
ADD CONSTRAINT "independent_payment_claims_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
