-- Do not guess existing learners' enrolment from their pathway or track.
ALTER TABLE "users" ADD COLUMN "elective_subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
