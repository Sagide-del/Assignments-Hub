-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "illustration" JSONB;

-- CreateTable
CREATE TABLE "SBA_Record" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "entered_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SBA_Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SBA_Record_student_id_subject_grade_level_idx" ON "SBA_Record"("student_id", "subject", "grade_level");

-- CreateIndex
CREATE INDEX "SBA_Record_school_id_grade_level_idx" ON "SBA_Record"("school_id", "grade_level");

-- CreateIndex
CREATE UNIQUE INDEX "SBA_Record_student_id_subject_grade_level_term_academic_yea_key" ON "SBA_Record"("student_id", "subject", "grade_level", "term", "academic_year");

-- AddForeignKey
ALTER TABLE "SBA_Record" ADD CONSTRAINT "SBA_Record_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBA_Record" ADD CONSTRAINT "SBA_Record_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBA_Record" ADD CONSTRAINT "SBA_Record_entered_by_school_id_fkey" FOREIGN KEY ("entered_by", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "SBA_Record" ADD CONSTRAINT "sba_score_range" CHECK (score >= 0 AND score <= 100);
ALTER TABLE "SBA_Record" ADD CONSTRAINT "sba_grade_level" CHECK (grade_level IN (10,11));
ALTER TABLE "SBA_Record" ADD CONSTRAINT "sba_term" CHECK (term IN ('Term 1','Term 2','Term 3'));
ALTER TABLE "SBA_Record" ADD CONSTRAINT "sba_year" CHECK (academic_year BETWEEN 2000 AND 2100);
