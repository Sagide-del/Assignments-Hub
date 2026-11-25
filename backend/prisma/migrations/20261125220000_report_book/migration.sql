BEGIN;
-- CreateTable
CREATE TABLE "ClassTeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "stream_id" TEXT NOT NULL,

    CONSTRAINT "ClassTeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBookPolicy" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "bands_json" JSONB NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportBookPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBookPeriod" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "stream_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "subjects" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportBookPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBookAssessment" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "assessment_name" TEXT NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "ReportBookAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment_Record" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "grade" TEXT NOT NULL,
    "remark" TEXT,
    "remark_suggestion" TEXT,
    "entered_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report_Card" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "period_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "grade_level" INTEGER NOT NULL,
    "subjects_json" JSONB NOT NULL,
    "student_json" JSONB NOT NULL,
    "school_json" JSONB NOT NULL,
    "policy_json" JSONB NOT NULL,
    "total_score" DOUBLE PRECISION,
    "average_score" DOUBLE PRECISION,
    "class_position" INTEGER,
    "cohort_size" INTEGER,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "teacher_comment" TEXT,
    "principal_comment" TEXT,
    "generated_by" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" INTEGER,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "Report_Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBookChange" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "period_id" TEXT,
    "actor_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportBookChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacherAssignment_stream_id_key" ON "ClassTeacherAssignment"("stream_id");

-- CreateIndex
CREATE INDEX "ClassTeacherAssignment_school_id_teacher_id_idx" ON "ClassTeacherAssignment"("school_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBookPolicy_school_id_grade_level_key" ON "ReportBookPolicy"("school_id", "grade_level");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBookPeriod_school_id_stream_id_term_year_key" ON "ReportBookPeriod"("school_id", "stream_id", "term", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBookPeriod_id_school_id_key" ON "ReportBookPeriod"("id", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBookAssessment_period_id_subject_assessment_name_key" ON "ReportBookAssessment"("period_id", "subject", "assessment_name");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBookAssessment_id_school_id_key" ON "ReportBookAssessment"("id", "school_id");

-- CreateIndex
CREATE INDEX "Assessment_Record_school_id_student_id_idx" ON "Assessment_Record"("school_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_Record_student_id_assessment_id_key" ON "Assessment_Record"("student_id", "assessment_id");

-- CreateIndex
CREATE INDEX "Report_Card_school_id_status_idx" ON "Report_Card"("school_id", "status");

-- CreateIndex
CREATE INDEX "Report_Card_student_id_status_published_at_idx" ON "Report_Card"("student_id", "status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "Report_Card_period_id_student_id_revision_key" ON "Report_Card"("period_id", "student_id", "revision");

-- CreateIndex
CREATE INDEX "ReportBookChange_school_id_created_at_idx" ON "ReportBookChange"("school_id", "created_at");

-- AddForeignKey
ALTER TABLE "ClassTeacherAssignment" ADD CONSTRAINT "ClassTeacherAssignment_teacher_id_school_id_fkey" FOREIGN KEY ("teacher_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacherAssignment" ADD CONSTRAINT "ClassTeacherAssignment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacherAssignment" ADD CONSTRAINT "ClassTeacherAssignment_stream_id_school_id_fkey" FOREIGN KEY ("stream_id", "school_id") REFERENCES "Stream"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBookPolicy" ADD CONSTRAINT "ReportBookPolicy_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBookPeriod" ADD CONSTRAINT "ReportBookPeriod_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBookPeriod" ADD CONSTRAINT "ReportBookPeriod_stream_id_school_id_fkey" FOREIGN KEY ("stream_id", "school_id") REFERENCES "Stream"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBookAssessment" ADD CONSTRAINT "ReportBookAssessment_period_id_school_id_fkey" FOREIGN KEY ("period_id", "school_id") REFERENCES "ReportBookPeriod"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment_Record" ADD CONSTRAINT "Assessment_Record_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment_Record" ADD CONSTRAINT "Assessment_Record_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment_Record" ADD CONSTRAINT "Assessment_Record_assessment_id_school_id_fkey" FOREIGN KEY ("assessment_id", "school_id") REFERENCES "ReportBookAssessment"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report_Card" ADD CONSTRAINT "Report_Card_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report_Card" ADD CONSTRAINT "Report_Card_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report_Card" ADD CONSTRAINT "Report_Card_period_id_school_id_fkey" FOREIGN KEY ("period_id", "school_id") REFERENCES "ReportBookPeriod"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBookChange" ADD CONSTRAINT "ReportBookChange_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBookChange" ADD CONSTRAINT "ReportBookChange_period_id_school_id_fkey" FOREIGN KEY ("period_id", "school_id") REFERENCES "ReportBookPeriod"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "ReportBookPolicy" ADD CONSTRAINT report_book_policy_grade CHECK (grade_level BETWEEN 1 AND 12);
ALTER TABLE "ReportBookPeriod" ADD CONSTRAINT report_book_period_term CHECK (term IN ('Term 1','Term 2','Term 3'));
ALTER TABLE "ReportBookPeriod" ADD CONSTRAINT report_book_period_year CHECK (year BETWEEN 2020 AND 2100);
ALTER TABLE "ReportBookPeriod" ADD CONSTRAINT report_book_period_status CHECK (status IN ('OPEN','DRAFT','REVIEW','PUBLISHED'));
ALTER TABLE "ReportBookAssessment" ADD CONSTRAINT report_book_assessment_limits CHECK (max_score > 0 AND max_score <= 10000 AND weight > 0 AND weight <= 100);
ALTER TABLE "Assessment_Record" ADD CONSTRAINT report_book_score_nonnegative CHECK (score >= 0 AND score <= 10000);
ALTER TABLE "Report_Card" ADD CONSTRAINT report_book_card_status CHECK (status IN ('DRAFT','REVIEW','PUBLISHED','ARCHIVED'));
COMMIT;
