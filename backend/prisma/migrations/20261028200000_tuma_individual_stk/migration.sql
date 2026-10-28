CREATE TABLE "independent_tuma_payments" (
 "id" SERIAL PRIMARY KEY, "student_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "reference" TEXT NOT NULL UNIQUE, "idempotency_key" TEXT NOT NULL UNIQUE,
 "amount_kes" INTEGER NOT NULL CHECK ("amount_kes">0), "phone" TEXT NOT NULL,
 "interval" "SubscriptionInterval" NOT NULL, "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
 "callback_token_hash" TEXT NOT NULL, "checkout_request_id" TEXT UNIQUE, "merchant_request_id" TEXT,
 "receipt_number" TEXT UNIQUE, "callback_payload" JSONB, "failure_reason" TEXT,
 "expires_at" TIMESTAMP(3) NOT NULL, "paid_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "independent_tuma_payments_student_id_status_idx" ON "independent_tuma_payments"("student_id","status");
CREATE UNIQUE INDEX "independent_tuma_one_active" ON "independent_tuma_payments"("student_id") WHERE "status" IN ('PENDING','PROCESSING');
UPDATE "payment_provider_configs" SET "is_active"=FALSE WHERE "method"='PAYSTACK';
