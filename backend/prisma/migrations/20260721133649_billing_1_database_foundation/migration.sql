-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('INTASEND', 'MPESA', 'EQUITY_PAYBILL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AWAITING_VERIFICATION', 'CONFIRMED', 'FAILED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "current_period_end" TIMESTAMP(3),
ADD COLUMN     "current_period_start" TIMESTAMP(3),
ADD COLUMN     "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "payment_method" "PaymentMethod";

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subscription_id" INTEGER,
    "invoice_id" INTEGER,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_reference" TEXT,
    "payment_reference" TEXT,
    "provider_name" TEXT,
    "amount_kes" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "payer_name" TEXT,
    "payer_phone" TEXT,
    "metadata" JSONB,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subscription_id" INTEGER,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
    "amount_kes" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "student_count_snapshot" INTEGER,
    "school_type_snapshot" "SchoolType",
    "plan_snapshot" TEXT,
    "issued_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_configs" (
    "id" SERIAL NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "display_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" SERIAL NOT NULL,
    "payment_transaction_id" INTEGER,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus",
    "event_type" TEXT NOT NULL,
    "provider_reference" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processing_notes" TEXT,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_ledger" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "invoice_id" INTEGER,
    "billing_period_start" TIMESTAMP(3) NOT NULL,
    "billing_period_end" TIMESTAMP(3) NOT NULL,
    "provider" "AiProvider",
    "model" TEXT,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "amount_kes" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_transactions_school_id_idx" ON "payment_transactions"("school_id");

-- CreateIndex
CREATE INDEX "payment_transactions_subscription_id_idx" ON "payment_transactions"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_transactions_invoice_id_idx" ON "payment_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_transactions_method_status_idx" ON "payment_transactions"("method", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_school_id_idx" ON "invoices"("school_id");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_configs_method_key" ON "payment_provider_configs"("method");

-- CreateIndex
CREATE INDEX "payment_webhook_events_payment_transaction_id_idx" ON "payment_webhook_events"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "payment_webhook_events_method_event_type_idx" ON "payment_webhook_events"("method", "event_type");

-- CreateIndex
CREATE INDEX "ai_usage_ledger_school_id_idx" ON "ai_usage_ledger"("school_id");

-- CreateIndex
CREATE INDEX "ai_usage_ledger_invoice_id_idx" ON "ai_usage_ledger"("invoice_id");

-- CreateIndex
CREATE INDEX "ai_usage_ledger_billing_period_start_billing_period_end_idx" ON "ai_usage_ledger"("billing_period_start", "billing_period_end");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
