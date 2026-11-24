CREATE TABLE "independent_intasend_payments" (
 "id" SERIAL NOT NULL, "student_id" INTEGER NOT NULL, "reference" VARCHAR(36) NOT NULL,
 "idempotency_key" TEXT NOT NULL,"amount_kes" INTEGER NOT NULL,"phone" TEXT NOT NULL,
 "interval" "SubscriptionInterval" NOT NULL,"status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
 "provider_reference" TEXT,"failure_reason" TEXT,"verified_payload" JSONB,
 "expires_at" TIMESTAMP(3) NOT NULL,"paid_at" TIMESTAMP(3),"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,"landing_source" VARCHAR(120),
 CONSTRAINT "independent_intasend_payments_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "independent_intasend_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "independent_intasend_payments_amount_positive" CHECK ("amount_kes">0)
);
CREATE UNIQUE INDEX "independent_intasend_payments_reference_key" ON "independent_intasend_payments"("reference");
CREATE UNIQUE INDEX "independent_intasend_payments_idempotency_key_key" ON "independent_intasend_payments"("idempotency_key");
CREATE UNIQUE INDEX "independent_intasend_payments_provider_reference_key" ON "independent_intasend_payments"("provider_reference");
CREATE INDEX "independent_intasend_payments_student_id_status_idx" ON "independent_intasend_payments"("student_id","status");
CREATE INDEX "independent_intasend_payments_status_updated_at_idx" ON "independent_intasend_payments"("status","updated_at");
