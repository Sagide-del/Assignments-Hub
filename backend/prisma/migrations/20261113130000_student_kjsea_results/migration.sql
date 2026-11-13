CREATE TABLE "student_kjsea_results" (
 "id" TEXT NOT NULL, "student_id" INTEGER NOT NULL, "school_id" INTEGER NOT NULL,
 "scores_json" JSONB NOT NULL, "source" TEXT NOT NULL DEFAULT 'SELF_REPORTED',
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "student_kjsea_results_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "student_kjsea_results_student_id_key" ON "student_kjsea_results"("student_id");
CREATE UNIQUE INDEX "student_kjsea_results_student_id_school_id_key" ON "student_kjsea_results"("student_id","school_id");
CREATE INDEX "student_kjsea_results_school_id_idx" ON "student_kjsea_results"("school_id");
ALTER TABLE "student_kjsea_results" ADD CONSTRAINT "student_kjsea_results_student_id_school_id_fkey" FOREIGN KEY ("student_id","school_id") REFERENCES "users"("id","school_id") ON DELETE CASCADE ON UPDATE CASCADE;
