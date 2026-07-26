-- AlterTable: BECF (Kenyan CBC) curriculum alignment fields on "labs".
-- All new columns are nullable or default to an empty array, so this is a
-- purely additive change — no existing row loses data and no existing
-- query breaks. Safe to run against a live database with the previous
-- application version still running (it simply won't reference these
-- columns until the new backend code is deployed).
ALTER TABLE "labs"
  ADD COLUMN "learning_outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "core_competencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "safety_checklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "assessment_criteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "pertinent_issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "junior_version" TEXT,
  ADD COLUMN "senior_version" TEXT,
  ADD COLUMN "adaptation_notes" TEXT,
  ADD COLUMN "portfolio_prompt" TEXT,
  ADD COLUMN "community_link" TEXT,
  ADD COLUMN "parent_activity" TEXT;
