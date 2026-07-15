-- CreateEnum
CREATE TYPE "SelectionSource" AS ENUM ('MANUAL', 'RECOMMENDATION');

-- CreateTable
CREATE TABLE "pathways" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL DEFAULT '#BBD125',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" SERIAL NOT NULL,
    "pathway_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required_subjects" JSONB NOT NULL,
    "min_mean_grade" TEXT,
    "careers" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "job_outlook" TEXT,
    "job_growth_rate" TEXT,
    "universities_kenya" JSONB NOT NULL,
    "universities_intl" JSONB NOT NULL,
    "degree_duration_years" INTEGER DEFAULT 4,
    "interest_tags" JSONB,
    "next_steps" JSONB,
    "extracurriculars" JSONB,
    "certifications" JSONB,
    "work_experience" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_pathway_selections" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "track_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "source" "SelectionSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pathway_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pathways_key_key" ON "pathways"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_pathway_id_key_key" ON "tracks"("pathway_id", "key");

-- CreateIndex
CREATE INDEX "tracks_pathway_id_idx" ON "tracks"("pathway_id");

-- CreateIndex
CREATE INDEX "student_pathway_selections_school_id_idx" ON "student_pathway_selections"("school_id");

-- CreateIndex
CREATE INDEX "student_pathway_selections_student_id_idx" ON "student_pathway_selections"("student_id");

-- CreateIndex
CREATE INDEX "student_pathway_selections_track_id_idx" ON "student_pathway_selections"("track_id");

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pathway_selections" ADD CONSTRAINT "student_pathway_selections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pathway_selections" ADD CONSTRAINT "student_pathway_selections_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pathway_selections" ADD CONSTRAINT "student_pathway_selections_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
