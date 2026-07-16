-- CreateEnum
CREATE TYPE "CslSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION');

-- CreateTable
CREATE TABLE "csl_activities" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "grade" TEXT NOT NULL,
    "competency" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "target_hours" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csl_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csl_submissions" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "csl_activity_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "evidence_url" TEXT,
    "reflection" TEXT,
    "status" "CslSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "max_score" INTEGER,
    "feedback" TEXT,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csl_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csl_activities_key_key" ON "csl_activities"("key");

-- CreateIndex
CREATE INDEX "csl_activities_grade_idx" ON "csl_activities"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "csl_submissions_csl_activity_id_student_id_key" ON "csl_submissions"("csl_activity_id", "student_id");

-- CreateIndex
CREATE INDEX "csl_submissions_school_id_idx" ON "csl_submissions"("school_id");

-- CreateIndex
CREATE INDEX "csl_submissions_student_id_idx" ON "csl_submissions"("student_id");

-- AddForeignKey
ALTER TABLE "csl_activities" ADD CONSTRAINT "csl_activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csl_submissions" ADD CONSTRAINT "csl_submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csl_submissions" ADD CONSTRAINT "csl_submissions_csl_activity_id_fkey" FOREIGN KEY ("csl_activity_id") REFERENCES "csl_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csl_submissions" ADD CONSTRAINT "csl_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csl_submissions" ADD CONSTRAINT "csl_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
