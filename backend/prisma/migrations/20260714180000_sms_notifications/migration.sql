-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "parent_phone" TEXT;

-- CreateEnum
CREATE TYPE "SmsType" AS ENUM ('ASSIGNMENT_COMPLETED', 'NEW_ASSIGNMENT', 'BROADCAST');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "type" "SmsType" NOT NULL,
    "to_phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL DEFAULT 'SENT',
    "error_message" TEXT,
    "student_id" INTEGER,
    "assignment_id" INTEGER,
    "sent_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_logs_school_id_idx" ON "sms_logs"("school_id");

-- CreateIndex
CREATE INDEX "sms_logs_student_id_idx" ON "sms_logs"("student_id");

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
