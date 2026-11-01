CREATE TABLE "learning_coach_report_cards" (
  "id" SERIAL NOT NULL,
  "school_id" INTEGER NOT NULL,
  "student_id" INTEGER NOT NULL,
  "asset_key" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_coach_report_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learning_coach_report_cards_student_id_created_at_idx"
ON "learning_coach_report_cards"("student_id", "created_at");

ALTER TABLE "learning_coach_report_cards"
ADD CONSTRAINT "learning_coach_report_cards_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_coach_report_cards"
ADD CONSTRAINT "learning_coach_report_cards_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
