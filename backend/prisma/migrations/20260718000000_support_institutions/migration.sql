-- CreateEnum
CREATE TYPE "DisabilityCategory" AS ENUM ('VISUAL_IMPAIRMENT', 'HEARING_IMPAIRMENT', 'PHYSICAL_DISABILITY', 'INTELLECTUAL_DEVELOPMENTAL', 'AUTISM_SPECTRUM', 'MULTIPLE_DEAFBLIND', 'OTHER_UNSURE');

-- CreateEnum
CREATE TYPE "SupportLevel" AS ENUM ('MILD_SOME_SUPPORT', 'MODERATE_REGULAR_SUPPORT', 'SIGNIFICANT_INTENSIVE_SUPPORT');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('ASSESSMENT_CENTER', 'SPECIAL_SCHOOL', 'INCLUSIVE_MAINSTREAM', 'VOCATIONAL_TRAINING', 'SUPPORT_ORGANIZATION');

-- CreateTable
CREATE TABLE "support_institutions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "categories" JSONB NOT NULL,
    "county" TEXT NOT NULL,
    "town" TEXT,
    "boarding_type" TEXT,
    "age_range" TEXT,
    "description" TEXT NOT NULL,
    "services_offered" JSONB,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "source_note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_support_assessments" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "category" "DisabilityCategory" NOT NULL,
    "support_level" "SupportLevel" NOT NULL,
    "has_formal_assessment" BOOLEAN NOT NULL DEFAULT false,
    "current_challenges" TEXT,
    "interests" JSONB,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_support_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_institutions_key_key" ON "support_institutions"("key");

-- CreateIndex
CREATE INDEX "support_institutions_type_idx" ON "support_institutions"("type");

-- CreateIndex
CREATE INDEX "student_support_assessments_school_id_idx" ON "student_support_assessments"("school_id");

-- CreateIndex
CREATE INDEX "student_support_assessments_student_id_idx" ON "student_support_assessments"("student_id");

-- AddForeignKey
ALTER TABLE "student_support_assessments" ADD CONSTRAINT "student_support_assessments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_support_assessments" ADD CONSTRAINT "student_support_assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
