CREATE TYPE "ResourceListingType" AS ENUM ('NOTES', 'ESSAY', 'REVISION_GUIDE', 'STUDY_GUIDE', 'TOOLKIT');
CREATE TYPE "ResourceFulfillment" AS ENUM ('DIGITAL_DOWNLOAD', 'PHYSICAL_DELIVERY');
CREATE TYPE "ResourceListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ResourcePurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'AWAITING_VERIFICATION', 'PAID', 'REJECTED', 'CANCELLED', 'FULFILLED');
CREATE TYPE "AcademicResultBatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "resource_listings" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceListingType" NOT NULL,
    "fulfillment" "ResourceFulfillment" NOT NULL,
    "status" "ResourceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "grade" TEXT,
    "price_kes" INTEGER NOT NULL,
    "platform_fee_bps" INTEGER NOT NULL,
    "asset_key" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "cover_image_url" TEXT,
    "stock_quantity" INTEGER,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resource_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_purchases" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "status" "ResourcePurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "payment_method" "PaymentMethod",
    "payment_reference" TEXT,
    "payer_phone" TEXT,
    "amount_kes" INTEGER NOT NULL,
    "platform_fee_kes" INTEGER NOT NULL,
    "seller_share_kes" INTEGER NOT NULL,
    "delivery_details" JSONB,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "fulfilled_at" TIMESTAMP(3),
    "last_downloaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resource_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academic_result_batches" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "class_name" TEXT,
    "stream" TEXT,
    "file_name" TEXT NOT NULL,
    "status" "AcademicResultBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "academic_result_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_academic_results" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "grade_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_academic_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_study_plans" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "generated_from_batch_id" INTEGER,
    "generated_by_id" INTEGER,
    "period_key" TEXT NOT NULL,
    "weak_subjects" JSONB NOT NULL,
    "timetable" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_study_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resource_listings_status_type_subject_grade_idx" ON "resource_listings"("status", "type", "subject", "grade");
CREATE INDEX "resource_listings_school_id_seller_id_status_idx" ON "resource_listings"("school_id", "seller_id", "status");
CREATE INDEX "resource_purchases_student_id_status_created_at_idx" ON "resource_purchases"("student_id", "status", "created_at");
CREATE INDEX "resource_purchases_resource_id_status_idx" ON "resource_purchases"("resource_id", "status");
CREATE INDEX "resource_purchases_school_id_status_idx" ON "resource_purchases"("school_id", "status");
CREATE INDEX "resource_purchases_payment_reference_idx" ON "resource_purchases"("payment_reference");
CREATE INDEX "academic_result_batches_school_id_academic_year_term_grade_stream_idx" ON "academic_result_batches"("school_id", "academic_year", "term", "grade", "stream");
CREATE INDEX "academic_result_batches_school_id_status_created_at_idx" ON "academic_result_batches"("school_id", "status", "created_at");
CREATE UNIQUE INDEX "student_academic_results_batch_id_student_id_subject_key" ON "student_academic_results"("batch_id", "student_id", "subject");
CREATE INDEX "student_academic_results_school_id_student_id_subject_created_idx" ON "student_academic_results"("school_id", "student_id", "subject", "created_at");
CREATE INDEX "student_academic_results_school_id_subject_percentage_idx" ON "student_academic_results"("school_id", "subject", "percentage");
CREATE UNIQUE INDEX "student_study_plans_student_id_period_key_key" ON "student_study_plans"("student_id", "period_key");
CREATE INDEX "student_study_plans_school_id_period_key_idx" ON "student_study_plans"("school_id", "period_key");

ALTER TABLE "resource_listings" ADD CONSTRAINT "resource_listings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_listings" ADD CONSTRAINT "resource_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resource_purchases" ADD CONSTRAINT "resource_purchases_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_purchases" ADD CONSTRAINT "resource_purchases_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resource_purchases" ADD CONSTRAINT "resource_purchases_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resource_purchases" ADD CONSTRAINT "resource_purchases_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academic_result_batches" ADD CONSTRAINT "academic_result_batches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academic_result_batches" ADD CONSTRAINT "academic_result_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_academic_results" ADD CONSTRAINT "student_academic_results_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_academic_results" ADD CONSTRAINT "student_academic_results_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "academic_result_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_academic_results" ADD CONSTRAINT "student_academic_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_study_plans" ADD CONSTRAINT "student_study_plans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_study_plans" ADD CONSTRAINT "student_study_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_study_plans" ADD CONSTRAINT "student_study_plans_generated_from_batch_id_fkey" FOREIGN KEY ("generated_from_batch_id") REFERENCES "academic_result_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_study_plans" ADD CONSTRAINT "student_study_plans_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
