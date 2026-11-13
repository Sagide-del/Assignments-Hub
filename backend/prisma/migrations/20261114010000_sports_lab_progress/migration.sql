CREATE TABLE "Sports_Lab_Progress" (
 "id" TEXT NOT NULL,
 "student_id" INTEGER NOT NULL,
 "simulation" TEXT NOT NULL,
 "score" INTEGER NOT NULL DEFAULT 0,
 "completed_at" TIMESTAMP(3),
 CONSTRAINT "Sports_Lab_Progress_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Sports_Lab_Progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Sports_Lab_Progress_score_check" CHECK ("score" BETWEEN 0 AND 100),
 CONSTRAINT "Sports_Lab_Progress_simulation_check" CHECK ("simulation" IN ('skeletal','muscle','energy','respiratory','reflex'))
);
CREATE UNIQUE INDEX "Sports_Lab_Progress_student_id_simulation_key" ON "Sports_Lab_Progress"("student_id","simulation");
CREATE INDEX "Sports_Lab_Progress_student_id_completed_at_idx" ON "Sports_Lab_Progress"("student_id","completed_at");
