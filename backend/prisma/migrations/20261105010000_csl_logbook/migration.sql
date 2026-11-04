-- CreateTable
CREATE TABLE "CSL_Logbook" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "activity_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,
    "hours_logged" DOUBLE PRECISION NOT NULL,
    "activity_date" DATE NOT NULL,
    "competency_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teacher_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_comment" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "submission_key" TEXT NOT NULL,
    "ai_status" TEXT NOT NULL DEFAULT 'PENDING',
    "ai_attempts" INTEGER NOT NULL DEFAULT 0,
    "ai_claimed_at" TIMESTAMP(3),
    "ai_retry_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CSL_Logbook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CSL_Logbook_student_id_school_id_idx" ON "CSL_Logbook"("student_id", "school_id");

-- CreateIndex
CREATE INDEX "CSL_Logbook_school_id_review_status_created_at_idx" ON "CSL_Logbook"("school_id", "review_status", "created_at");

-- CreateIndex
CREATE INDEX "CSL_Logbook_ai_status_ai_retry_at_idx" ON "CSL_Logbook"("ai_status", "ai_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "CSL_Logbook_student_id_submission_key_key" ON "CSL_Logbook"("student_id", "submission_key");

-- AddForeignKey
ALTER TABLE "CSL_Logbook" ADD CONSTRAINT "CSL_Logbook_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSL_Logbook" ADD CONSTRAINT "CSL_Logbook_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSL_Logbook" ADD CONSTRAINT "CSL_Logbook_approved_by_school_id_fkey" FOREIGN KEY ("approved_by", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSL_Logbook" ADD CONSTRAINT "CSL_Logbook_reviewed_by_school_id_fkey" FOREIGN KEY ("reviewed_by", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CSL_Logbook"
 ADD CONSTRAINT "CSL_hours_check" CHECK (hours_logged > 0 AND hours_logged <= 24),
 ADD CONSTRAINT "CSL_review_state_check" CHECK (review_status IN ('PENDING','APPROVED','REJECTED')),
 ADD CONSTRAINT "CSL_approval_check" CHECK ((review_status='APPROVED' AND teacher_approved AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR (review_status<>'APPROVED' AND NOT teacher_approved AND approved_by IS NULL AND approved_at IS NULL)),
 ADD CONSTRAINT "CSL_ai_state_check" CHECK (ai_status IN ('PENDING','PROCESSING','COMPLETE','FAILED'));
