CREATE TABLE "Music_Studio_Project" (
 "id" TEXT NOT NULL, "student_id" INTEGER NOT NULL, "title" TEXT NOT NULL,
 "bpm" INTEGER NOT NULL DEFAULT 120, "time_signature" TEXT NOT NULL DEFAULT '4/4',
 "tracks_json" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Music_Studio_Project_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Music_Studio_Project_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Music_Studio_Project_student_id_updated_at_idx" ON "Music_Studio_Project"("student_id", "updated_at");
