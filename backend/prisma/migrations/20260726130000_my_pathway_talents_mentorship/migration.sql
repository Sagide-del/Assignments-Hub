-- CreateTable / CreateEnum: "My Pathway" redesign — Talents & Strengths and
-- Mentorship. All four tables are brand new, so this is purely additive —
-- no existing table loses a column and no existing query changes. Safe to
-- run against a live database with the previous application version still
-- running.

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "student_talent_profiles" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "talents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reflection" TEXT,
    "growth_plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_talent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_profiles" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "bio" TEXT,
    "expertise_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_requests" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "mentor_profile_id" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "mentorship_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_log_entries" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentorship_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_talent_profiles_student_id_key" ON "student_talent_profiles"("student_id");

-- CreateIndex
CREATE INDEX "student_talent_profiles_school_id_idx" ON "student_talent_profiles"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_teacher_id_key" ON "mentor_profiles"("teacher_id");

-- CreateIndex
CREATE INDEX "mentor_profiles_school_id_idx" ON "mentor_profiles"("school_id");

-- CreateIndex
CREATE INDEX "mentorship_requests_school_id_idx" ON "mentorship_requests"("school_id");

-- CreateIndex
CREATE INDEX "mentorship_requests_student_id_idx" ON "mentorship_requests"("student_id");

-- CreateIndex
CREATE INDEX "mentorship_requests_mentor_profile_id_idx" ON "mentorship_requests"("mentor_profile_id");

-- CreateIndex
CREATE INDEX "mentorship_log_entries_request_id_idx" ON "mentorship_log_entries"("request_id");

-- AddForeignKey
ALTER TABLE "student_talent_profiles" ADD CONSTRAINT "student_talent_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_talent_profiles" ADD CONSTRAINT "student_talent_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_mentor_profile_id_fkey" FOREIGN KEY ("mentor_profile_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_log_entries" ADD CONSTRAINT "mentorship_log_entries_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mentorship_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_log_entries" ADD CONSTRAINT "mentorship_log_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
