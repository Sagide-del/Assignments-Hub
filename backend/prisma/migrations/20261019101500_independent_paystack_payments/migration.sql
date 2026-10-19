CREATE TABLE "independent_paystack_payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "email" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "rawPayload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "independent_paystack_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "independent_paystack_payments_reference_key" ON "independent_paystack_payments"("reference");
CREATE INDEX "independent_paystack_payments_student_id_status_idx" ON "independent_paystack_payments"("student_id", "status");

ALTER TABLE "independent_paystack_payments"
ADD CONSTRAINT "independent_paystack_payments_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
