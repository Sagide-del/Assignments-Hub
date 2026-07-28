-- Add native auto-gradable response types without changing existing values.
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'NUMERIC';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'SHORT_ANSWER';

-- Nullable and additive: existing questions continue to use their current
-- answer keys and grading behavior.
ALTER TABLE "questions"
  ADD COLUMN "config" JSONB;
