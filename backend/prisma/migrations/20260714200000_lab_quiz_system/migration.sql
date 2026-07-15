-- AlterTable: catalog metadata needed to render a real STEM Labs catalog
-- (grade filtering, topic/pathway grouping, expected video duration, and
-- narration lines for the frontend's text-to-speech voice-over).
ALTER TABLE "labs"
  ADD COLUMN "grade" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "topic_area" TEXT,
  ADD COLUMN "pathway" TEXT,
  ADD COLUMN "duration_minutes" INTEGER,
  ADD COLUMN "guidance_steps" JSONB;

-- CreateIndex
CREATE INDEX "labs_grade_idx" ON "labs"("grade");

-- AlterTable: post-video knowledge-check quiz results, reflected on the
-- student's report card.
ALTER TABLE "lab_sessions"
  ADD COLUMN "score" INTEGER,
  ADD COLUMN "max_score" INTEGER,
  ADD COLUMN "answers" JSONB,
  ADD COLUMN "quiz_completed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "lab_questions" (
    "id" SERIAL NOT NULL,
    "lab_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "options" JSONB,
    "correct_answer" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_questions_lab_id_idx" ON "lab_questions"("lab_id");

-- AddForeignKey
ALTER TABLE "lab_questions" ADD CONSTRAINT "lab_questions_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
