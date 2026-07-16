-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY', 'FILE_UPLOAD', 'MATCHING', 'ORDERING');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED');

-- AlterTable
ALTER TABLE "assignments"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "due_date" TIMESTAMP(3),
  ADD COLUMN "max_points" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "publish_date" TIMESTAMP(3),
  ADD COLUMN "attachments" JSONB,
  ADD COLUMN "resources" JSONB;

-- AlterTable
ALTER TABLE "submissions"
  ADD COLUMN "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN "is_late" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "feedback" TEXT,
  ADD COLUMN "attachments" JSONB,
  ADD COLUMN "graded_by_id" INTEGER,
  ADD COLUMN "graded_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL DEFAULT 'ESSAY',
    "options" JSONB,
    "correct_answer" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL DEFAULT 0,
    "hint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "total_points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "student_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN,
    "points_awarded" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_assignment_id_idx" ON "questions"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "rubrics_assignment_id_key" ON "rubrics"("assignment_id");

-- CreateIndex
CREATE INDEX "answers_submission_id_idx" ON "answers"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_submission_id_question_id_key" ON "answers"("submission_id", "question_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_graded_by_id_fkey" FOREIGN KEY ("graded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
