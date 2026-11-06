CREATE TABLE "independent_jenga_payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "reference" VARCHAR(6) NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_reference" TEXT,
    "receipt_number" TEXT,
    "callback_payload" JSONB,
    "failure_reason" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "independent_jenga_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "independent_jenga_payments_reference_key" ON "independent_jenga_payments"("reference");
CREATE UNIQUE INDEX "independent_jenga_payments_idempotency_key_key" ON "independent_jenga_payments"("idempotency_key");
CREATE UNIQUE INDEX "independent_jenga_payments_provider_reference_key" ON "independent_jenga_payments"("provider_reference");
CREATE UNIQUE INDEX "independent_jenga_payments_receipt_number_key" ON "independent_jenga_payments"("receipt_number");
CREATE INDEX "independent_jenga_payments_student_id_status_idx" ON "independent_jenga_payments"("student_id", "status");

ALTER TABLE "independent_jenga_payments"
ADD CONSTRAINT "independent_jenga_payments_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
