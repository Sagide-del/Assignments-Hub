-- CreateEnum
CREATE TYPE "LabStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SchoolThemeTemplate" AS ENUM ('ACADEMIC_NAVY', 'ROYAL_BLUE', 'MODERN_TEAL', 'EMERALD_EDUCATION', 'MAROON_PROFESSIONAL');

-- AlterTable
ALTER TABLE "lab_sessions" ADD COLUMN     "completion_summary" JSONB,
ADD COLUMN     "reflection_answers" JSONB,
ADD COLUMN     "step_progress" JSONB,
ADD COLUMN     "time_spent_seconds" INTEGER;

-- AlterTable
ALTER TABLE "labs" ADD COLUMN     "animation_url" TEXT,
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "intro_video_url" TEXT,
ADD COLUMN     "status" "LabStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "stem_subject_id" INTEGER,
ADD COLUMN     "topic" TEXT,
ADD COLUMN     "voice_audio_url" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "theme_template" "SchoolThemeTemplate" NOT NULL DEFAULT 'ACADEMIC_NAVY';

-- CreateTable
CREATE TABLE "stem_categories" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stem_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stem_subjects" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stem_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_media" (
    "id" SERIAL NOT NULL,
    "lab_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_steps" (
    "id" SERIAL NOT NULL,
    "lab_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "media_url" TEXT,
    "interaction_type" TEXT,
    "expected_outcome" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_reflection_prompts" (
    "id" SERIAL NOT NULL,
    "lab_id" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_reflection_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_completion_report_templates" (
    "id" SERIAL NOT NULL,
    "lab_id" INTEGER NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "outcomes_json" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_completion_report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stem_categories_key_key" ON "stem_categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "stem_categories_name_key" ON "stem_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stem_subjects_key_key" ON "stem_subjects"("key");

-- CreateIndex
CREATE UNIQUE INDEX "stem_subjects_name_key" ON "stem_subjects"("name");

-- CreateIndex
CREATE INDEX "stem_subjects_category_id_idx" ON "stem_subjects"("category_id");

-- CreateIndex
CREATE INDEX "lab_media_lab_id_idx" ON "lab_media"("lab_id");

-- CreateIndex
CREATE INDEX "lab_steps_lab_id_idx" ON "lab_steps"("lab_id");

-- CreateIndex
CREATE INDEX "lab_reflection_prompts_lab_id_idx" ON "lab_reflection_prompts"("lab_id");

-- CreateIndex
CREATE UNIQUE INDEX "lab_completion_report_templates_lab_id_key" ON "lab_completion_report_templates"("lab_id");

-- CreateIndex
CREATE INDEX "labs_category_id_idx" ON "labs"("category_id");

-- CreateIndex
CREATE INDEX "labs_stem_subject_id_idx" ON "labs"("stem_subject_id");

-- AddForeignKey
ALTER TABLE "labs" ADD CONSTRAINT "labs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "stem_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labs" ADD CONSTRAINT "labs_stem_subject_id_fkey" FOREIGN KEY ("stem_subject_id") REFERENCES "stem_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stem_subjects" ADD CONSTRAINT "stem_subjects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "stem_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_media" ADD CONSTRAINT "lab_media_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_steps" ADD CONSTRAINT "lab_steps_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reflection_prompts" ADD CONSTRAINT "lab_reflection_prompts_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_completion_report_templates" ADD CONSTRAINT "lab_completion_report_templates_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
