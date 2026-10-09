-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('STANDARD', 'KCSE_PAPER');

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN "kind" "AssignmentKind" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "question_bank_source_documents" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "file_name" TEXT,
    "source_type" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "question_bank_source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_source_chunks" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "search_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_bank_source_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_usages" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "question_bank_id" INTEGER NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "selected_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_bank_usages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "question_bank" ADD COLUMN "source_document_id" INTEGER;

CREATE UNIQUE INDEX "question_bank_source_documents_content_hash_subject_grade_key" ON "question_bank_source_documents"("content_hash", "subject", "grade");
CREATE INDEX "question_bank_source_documents_subject_grade_created_at_idx" ON "question_bank_source_documents"("subject", "grade", "created_at");
CREATE UNIQUE INDEX "question_bank_source_chunks_document_id_ordinal_key" ON "question_bank_source_chunks"("document_id", "ordinal");
CREATE INDEX "question_bank_source_chunks_document_id_idx" ON "question_bank_source_chunks"("document_id");
CREATE UNIQUE INDEX "question_bank_usages_assignment_id_question_bank_id_key" ON "question_bank_usages"("assignment_id", "question_bank_id");
CREATE INDEX "question_bank_usages_school_id_question_bank_id_created_at_idx" ON "question_bank_usages"("school_id", "question_bank_id", "created_at");
CREATE INDEX "assignments_school_id_kind_grade_is_published_idx" ON "assignments"("school_id", "kind", "grade", "is_published");
CREATE INDEX "question_bank_source_document_id_idx" ON "question_bank"("source_document_id");

ALTER TABLE "question_bank_source_documents" ADD CONSTRAINT "question_bank_source_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_source_chunks" ADD CONSTRAINT "question_bank_source_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "question_bank_source_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bank_usages" ADD CONSTRAINT "question_bank_usages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bank_usages" ADD CONSTRAINT "question_bank_usages_question_bank_id_fkey" FOREIGN KEY ("question_bank_id") REFERENCES "question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bank_usages" ADD CONSTRAINT "question_bank_usages_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bank_usages" ADD CONSTRAINT "question_bank_usages_selected_by_id_fkey" FOREIGN KEY ("selected_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "question_bank_source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
