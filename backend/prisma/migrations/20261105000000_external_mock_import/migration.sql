-- CreateTable
CREATE TABLE "ExternalMock_Record" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "imported_by" INTEGER NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalMock_Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SBA_Projection" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "grade10_sba" DOUBLE PRECISION,
    "grade11_sba" DOUBLE PRECISION,
    "internal_mock" DOUBLE PRECISION,
    "external_mock" DOUBLE PRECISION,
    "kcbe_mock_final" DOUBLE PRECISION,
    "projected" DOUBLE PRECISION,
    "predicted_grade" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SBA_Projection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalMock_Record_student_id_subject_grade_level_idx" ON "ExternalMock_Record"("student_id", "subject", "grade_level");

-- CreateIndex
CREATE INDEX "ExternalMock_Record_school_id_grade_level_academic_year_idx" ON "ExternalMock_Record"("school_id", "grade_level", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMock_Record_student_id_subject_grade_level_term_aca_key" ON "ExternalMock_Record"("student_id", "subject", "grade_level", "term", "academic_year", "source");

-- CreateIndex
CREATE UNIQUE INDEX "SBA_Projection_student_id_key" ON "SBA_Projection"("student_id");

-- CreateIndex
CREATE INDEX "SBA_Projection_school_id_idx" ON "SBA_Projection"("school_id");

-- AddForeignKey
ALTER TABLE "ExternalMock_Record" ADD CONSTRAINT "ExternalMock_Record_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMock_Record" ADD CONSTRAINT "ExternalMock_Record_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMock_Record" ADD CONSTRAINT "ExternalMock_Record_imported_by_school_id_fkey" FOREIGN KEY ("imported_by", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBA_Projection" ADD CONSTRAINT "SBA_Projection_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SBA_Projection" ADD CONSTRAINT "SBA_Projection_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "ExternalMock_Record" ADD CONSTRAINT "ExternalMock_score_check" CHECK (score >= 0 AND score <= 100), ADD CONSTRAINT "ExternalMock_grade_check" CHECK (grade_level IN (10,11,12)), ADD CONSTRAINT "ExternalMock_term_check" CHECK (term IN ('Term 1','Term 2','Term 3')), ADD CONSTRAINT "ExternalMock_year_check" CHECK (academic_year BETWEEN 2000 AND 2100);
