CREATE TABLE "independent_password_resets" (
  "id" SERIAL NOT NULL,
  "student_id" INTEGER NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "independent_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "independent_password_resets_student_id_key" ON "independent_password_resets"("student_id");
CREATE INDEX "independent_password_resets_expires_at_idx" ON "independent_password_resets"("expires_at");
ALTER TABLE "independent_password_resets" ADD CONSTRAINT "independent_password_resets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
