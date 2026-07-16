-- CreateTable: named question groups within an exam paper (Section A,
-- Section B, ...). Optional — assignments built via the manual
-- question-builder form have no rows here.
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sections_assignment_id_idx" ON "sections"("assignment_id");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: link a question to its section (nullable — existing questions
-- and manually-built assignments have no section).
ALTER TABLE "questions"
  ADD COLUMN "section_id" INTEGER;

-- CreateIndex
CREATE INDEX "questions_section_id_idx" ON "questions"("section_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: exam-paper metadata for JSON-uploaded assignments (see
-- POST /assignments/from-json). All nullable — assignments created via the
-- manual form leave these unset.
ALTER TABLE "assignments"
  ADD COLUMN "time_allowed_minutes" INTEGER,
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "raw_json" JSONB;

-- AlterTable: draft-save / time-tracking support for the exam-taking UI.
ALTER TABLE "submissions"
  ADD COLUMN "started_at" TIMESTAMP(3),
  ADD COLUMN "time_spent_seconds" INTEGER;
