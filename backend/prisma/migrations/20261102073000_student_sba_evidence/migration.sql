CREATE TABLE "student_sba_evidence" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "asset_key" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_sba_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_sba_evidence_school_id_student_id_status_idx" ON "student_sba_evidence"("school_id", "student_id", "status");
CREATE INDEX "student_sba_evidence_student_id_created_at_idx" ON "student_sba_evidence"("student_id", "created_at");
ALTER TABLE "student_sba_evidence" ADD CONSTRAINT "student_sba_evidence_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_sba_evidence" ADD CONSTRAINT "student_sba_evidence_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_sba_evidence" ADD CONSTRAINT "student_sba_evidence_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
