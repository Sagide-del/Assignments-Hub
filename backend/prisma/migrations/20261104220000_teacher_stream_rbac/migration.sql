-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stream_id_school_id_key" ON "Stream"("id", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stream_school_id_grade_name_key" ON "Stream"("school_id", "grade", "name");

-- CreateIndex
CREATE INDEX "TeacherAssignment_school_id_teacher_id_idx" ON "TeacherAssignment"("school_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacher_id_subject_stream_id_key" ON "TeacherAssignment"("teacher_id", "subject", "stream_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_school_id_key" ON "users"("id", "school_id");

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacher_id_school_id_fkey" FOREIGN KEY ("teacher_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_stream_id_school_id_fkey" FOREIGN KEY ("stream_id", "school_id") REFERENCES "Stream"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Catalogue existing student streams without changing enrolment or granting access.
INSERT INTO "Stream" ("id", "school_id", "grade", "name")
SELECT md5(u.school_id::text || ':' || u.grade || ':' || p.stream), u.school_id, u.grade, p.stream
FROM users u JOIN student_profiles p ON p.user_id = u.id
WHERE u.role = 'STUDENT' AND u.grade IS NOT NULL AND length(trim(u.grade)) > 0 AND p.stream IS NOT NULL AND length(trim(p.stream)) > 0
GROUP BY u.school_id, u.grade, p.stream
ON CONFLICT ("school_id", "grade", "name") DO NOTHING;
