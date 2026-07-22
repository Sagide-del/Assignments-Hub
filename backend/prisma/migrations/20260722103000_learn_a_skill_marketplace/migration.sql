CREATE TYPE "SkillContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "SkillEnrollmentStatus" AS ENUM ('REQUESTED', 'AWAITING_PAYMENT', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED');

CREATE TABLE "skill_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "image_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "SkillContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "contact_email" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "SkillContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_courses" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "full_description" TEXT NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "cost_kes" INTEGER NOT NULL,
    "certificate_available" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail_url" TEXT,
    "learning_outcomes" JSONB,
    "course_structure" JSONB,
    "status" "SkillContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_enrollments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "status" "SkillEnrollmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "skill_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "transaction_reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_categories_name_key" ON "skill_categories"("name");
CREATE INDEX "skill_categories_status_display_order_idx" ON "skill_categories"("status", "display_order");
CREATE UNIQUE INDEX "skill_providers_name_key" ON "skill_providers"("name");
CREATE INDEX "skill_providers_status_idx" ON "skill_providers"("status");
CREATE INDEX "skill_courses_category_id_status_idx" ON "skill_courses"("category_id", "status");
CREATE INDEX "skill_courses_provider_id_idx" ON "skill_courses"("provider_id");
CREATE INDEX "skill_courses_status_idx" ON "skill_courses"("status");
CREATE UNIQUE INDEX "skill_enrollments_student_id_course_id_key" ON "skill_enrollments"("student_id", "course_id");
CREATE INDEX "skill_enrollments_course_id_status_idx" ON "skill_enrollments"("course_id", "status");
CREATE INDEX "skill_enrollments_student_id_status_idx" ON "skill_enrollments"("student_id", "status");
CREATE INDEX "skill_payments_student_id_course_id_idx" ON "skill_payments"("student_id", "course_id");
CREATE INDEX "skill_payments_status_idx" ON "skill_payments"("status");

ALTER TABLE "skill_courses" ADD CONSTRAINT "skill_courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_courses" ADD CONSTRAINT "skill_courses_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "skill_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_enrollments" ADD CONSTRAINT "skill_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_enrollments" ADD CONSTRAINT "skill_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "skill_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_payments" ADD CONSTRAINT "skill_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_payments" ADD CONSTRAINT "skill_payments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "skill_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
