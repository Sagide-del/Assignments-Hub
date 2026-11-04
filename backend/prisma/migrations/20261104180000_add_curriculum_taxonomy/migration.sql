CREATE TABLE "CurriculumTaxonomy" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "pathway" TEXT,
  "track" TEXT,
  "subject" TEXT NOT NULL,
  "topics" TEXT[] NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'USER_PROVIDED',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumTaxonomy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CurriculumTaxonomy_grade_check" CHECK ("grade" BETWEEN 1 AND 12),
  CONSTRAINT "CurriculumTaxonomy_routing_check" CHECK (
    ("grade" <= 9 AND "pathway" IS NULL AND "track" IS NULL) OR
    ("grade" >= 10 AND length(trim("pathway")) > 0 AND length(trim("track")) > 0 AND "pathway" IS NOT NULL AND "track" IS NOT NULL)
  )
);
CREATE INDEX "CurriculumTaxonomy_grade_pathway_track_subject_idx" ON "CurriculumTaxonomy"("grade", "pathway", "track", "subject");
