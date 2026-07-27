-- AlterTable: adds an optional individual-subscription expiry to "users",
-- used only by independent (non-school) students — see
-- backend/src/independent-students. Regular school-affiliated students
-- never set this column, so it's a safe, purely additive default-NULL
-- change with zero effect on existing login/access logic until a value is
-- actually present.
ALTER TABLE "users"
  ADD COLUMN "subscription_expires_at" TIMESTAMP(3);

-- CreateTable: "independent_student_invoices" — one row per M-Pesa Till
-- Number payment a platform admin manually records for an independent
-- student (confirmed by its M-Pesa code), which is what extends that
-- student's subscription_expires_at and reactivates their account. Brand
-- new table, no existing column/table changes beyond the one above, so
-- this is safe to run against the live database ahead of deploying the new
-- backend code.
CREATE TABLE "independent_student_invoices" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "mpesa_code" TEXT NOT NULL,
    "payer_phone" TEXT,
    "recorded_by_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "independent_student_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "independent_student_invoices_invoice_number_key" ON "independent_student_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "independent_student_invoices_student_id_idx" ON "independent_student_invoices"("student_id");

-- AddForeignKey
ALTER TABLE "independent_student_invoices" ADD CONSTRAINT "independent_student_invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "independent_student_invoices" ADD CONSTRAINT "independent_student_invoices_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
