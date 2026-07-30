-- OpenAI provider migration + centralized Question Bank. Additive only —
-- no existing table, column, or enum value is altered or dropped.

-- AlterEnum
-- DEEPSEEK/CLAUDE are intentionally left in place (see schema.prisma's
-- AiProvider comment) so historical AiUsageLog/AiGenerationJob rows keep a
-- valid provider value; nothing writes those two values going forward.
ALTER TYPE "AiProvider" ADD VALUE IF NOT EXISTS 'OPENAI';

-- CreateEnum
CREATE TYPE "QuestionBankSource" AS ENUM (
  'PLATFORM',
  'SCHOOL'
);

CREATE TYPE "QuestionBankStatus" AS ENUM (
  'GENERATED',
  'APPROVED',
  'REJECTED'
);

-- CreateTable
CREATE TABLE "question_bank" (
  "id" SERIAL NOT NULL,
  "source" "QuestionBankSource" NOT NULL DEFAULT 'PLATFORM',
  "is_global" BOOLEAN NOT NULL DEFAULT true,
  "school_id" INTEGER,
  "created_by_id" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "question_text" TEXT NOT NULL,
  "content_html" TEXT,
  "question_type" "QuestionType" NOT NULL DEFAULT 'ESSAY',
  "options" JSONB,
  "config" JSONB,
  "correct_answer" TEXT,
  "explanation" TEXT,
  "points" INTEGER NOT NULL DEFAULT 10,
  "hint" TEXT,
  "difficulty" TEXT,
  "status" "QuestionBankStatus" NOT NULL DEFAULT 'GENERATED',
  "generation_batch_id" TEXT,
  "source_file_name" TEXT,
  "reviewed_by_id" INTEGER,
  "reviewed_at" TIMESTAMP(3),
  "published_assignment_id" INTEGER,
  "published_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "school_question_bank_access" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "activated_by_id" INTEGER,
  "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "school_question_bank_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_bank_is_global_status_subject_grade_idx"
  ON "question_bank"("is_global", "status", "subject", "grade");

CREATE INDEX "question_bank_school_id_status_idx"
  ON "question_bank"("school_id", "status");

CREATE INDEX "question_bank_generation_batch_id_idx"
  ON "question_bank"("generation_batch_id");

CREATE UNIQUE INDEX "school_question_bank_access_school_id_key"
  ON "school_question_bank_access"("school_id");

-- AddForeignKey
ALTER TABLE "question_bank"
  ADD CONSTRAINT "question_bank_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_bank"
  ADD CONSTRAINT "question_bank_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "question_bank"
  ADD CONSTRAINT "question_bank_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_bank"
  ADD CONSTRAINT "question_bank_published_assignment_id_fkey"
  FOREIGN KEY ("published_assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "school_question_bank_access"
  ADD CONSTRAINT "school_question_bank_access_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "school_question_bank_access"
  ADD CONSTRAINT "school_question_bank_access_activated_by_id_fkey"
  FOREIGN KEY ("activated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
