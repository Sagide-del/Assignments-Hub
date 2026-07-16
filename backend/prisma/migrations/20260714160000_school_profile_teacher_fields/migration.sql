-- AlterTable
ALTER TABLE "schools"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "contact_email" TEXT;

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "subject" TEXT,
  ADD COLUMN "assigned_class" TEXT;
