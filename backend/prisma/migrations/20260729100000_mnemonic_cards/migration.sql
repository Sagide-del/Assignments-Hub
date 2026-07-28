CREATE TABLE "mnemonic_cards" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "grade" TEXT,
  "description" TEXT,
  "pdf_url" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_size" INTEGER,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mnemonic_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mnemonic_cards_is_published_grade_idx"
  ON "mnemonic_cards"("is_published", "grade");

CREATE INDEX "mnemonic_cards_subject_topic_idx"
  ON "mnemonic_cards"("subject", "topic");
