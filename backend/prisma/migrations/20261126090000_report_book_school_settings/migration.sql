BEGIN;

CREATE TABLE "report_book_school_settings" (
    "school_id" INTEGER NOT NULL,
    "principal_name" TEXT,
    "principal_signature_url" TEXT,
    "school_closes_on" TIMESTAMP(3),
    "school_closes_time" TEXT,
    "school_opens_on" TIMESTAMP(3),
    "school_opens_time" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "report_book_school_settings_pkey" PRIMARY KEY ("school_id")
);

ALTER TABLE "report_book_school_settings"
  ADD CONSTRAINT "report_book_school_settings_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
