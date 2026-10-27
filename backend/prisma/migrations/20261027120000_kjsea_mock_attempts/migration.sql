-- CreateTable
CREATE TABLE "kjsea_mock_attempts" (
    "subject" TEXT NOT NULL DEFAULT 'Mathematics',
    "source" TEXT NOT NULL DEFAULT 'GENERATED',
    "coverage" JSONB NOT NULL DEFAULT '{}',
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'kjsea-maths-v1',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "time_limit_minutes" INTEGER,
    "score" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kjsea_mock_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kjsea_mock_attempts_school_id_student_id_created_at_idx" ON "kjsea_mock_attempts"("school_id", "student_id", "created_at");

-- AddForeignKey
ALTER TABLE "kjsea_mock_attempts" ADD CONSTRAINT "kjsea_mock_attempts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kjsea_mock_attempts" ADD CONSTRAINT "kjsea_mock_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

