CREATE TABLE "student_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "admission_number" TEXT,
    "grade" TEXT,
    "class_name" TEXT,
    "stream" TEXT,
    "pathway" TEXT,
    "parent_name" TEXT,
    "parent_phone" TEXT,
    "parent_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");
CREATE INDEX "student_profiles_admission_number_idx" ON "student_profiles"("admission_number");
CREATE INDEX "student_profiles_grade_idx" ON "student_profiles"("grade");
CREATE INDEX "student_profiles_pathway_idx" ON "student_profiles"("pathway");

ALTER TABLE "student_profiles"
ADD CONSTRAINT "student_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "student_profiles" (
    "user_id",
    "admission_number",
    "grade",
    "parent_phone",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "admission_number",
    "grade",
    "parent_phone",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE "role" = 'STUDENT'
ON CONFLICT ("user_id") DO NOTHING;
