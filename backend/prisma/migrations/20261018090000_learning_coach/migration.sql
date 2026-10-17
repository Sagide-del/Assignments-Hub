-- Additive learning-coach records. Formal assignments and submissions remain
-- unchanged; these tables hold private diagnostic and practice activity.
CREATE TABLE "learning_coach_plans" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "student_id" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "mastery_score" INTEGER NOT NULL DEFAULT 0,
  "last_diagnostic_score" INTEGER,
  "recommended_technique" TEXT NOT NULL,
  "focus_areas" JSONB NOT NULL,
  "plan" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "learning_coach_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_coach_sessions" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "student_id" INTEGER NOT NULL,
  "plan_id" INTEGER NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'PRACTICE',
  "question_ids" INTEGER[] NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "learning_coach_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_coach_responses" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "session_id" INTEGER NOT NULL,
  "student_id" INTEGER NOT NULL,
  "question_bank_id" INTEGER NOT NULL,
  "answer" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL,
  "feedback" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_coach_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learning_coach_plans_student_id_subject_grade_topic_key"
  ON "learning_coach_plans"("student_id", "subject", "grade", "topic");
CREATE INDEX "learning_coach_plans_school_id_subject_grade_idx"
  ON "learning_coach_plans"("school_id", "subject", "grade");
CREATE INDEX "learning_coach_plans_student_id_updated_at_idx"
  ON "learning_coach_plans"("student_id", "updated_at");
CREATE INDEX "learning_coach_sessions_school_id_student_id_completed_at_idx"
  ON "learning_coach_sessions"("school_id", "student_id", "completed_at");
CREATE INDEX "learning_coach_sessions_plan_id_started_at_idx"
  ON "learning_coach_sessions"("plan_id", "started_at");
CREATE UNIQUE INDEX "learning_coach_responses_session_id_question_bank_id_key"
  ON "learning_coach_responses"("session_id", "question_bank_id");
CREATE INDEX "learning_coach_responses_student_id_question_bank_id_created_at_idx"
  ON "learning_coach_responses"("student_id", "question_bank_id", "created_at");
CREATE INDEX "learning_coach_responses_school_id_student_id_created_at_idx"
  ON "learning_coach_responses"("school_id", "student_id", "created_at");

ALTER TABLE "learning_coach_plans"
  ADD CONSTRAINT "learning_coach_plans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_coach_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_coach_sessions"
  ADD CONSTRAINT "learning_coach_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_coach_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_coach_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "learning_coach_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_coach_responses"
  ADD CONSTRAINT "learning_coach_responses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_coach_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "learning_coach_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_coach_responses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "learning_coach_responses_question_bank_id_fkey" FOREIGN KEY ("question_bank_id") REFERENCES "question_bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
