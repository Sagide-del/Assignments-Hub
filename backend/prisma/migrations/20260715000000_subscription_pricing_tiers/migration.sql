-- CreateEnum: Day School vs Boarding School — determines which per-student
-- rate applies at every pricing tier (see backend/src/common/config/plans.ts).
CREATE TYPE "SchoolType" AS ENUM ('DAY', 'BOARDING');

-- AlterTable: self-declared by the school admin on their own school
-- settings, defaulting to DAY so existing schools keep working unchanged.
ALTER TABLE "schools"
  ADD COLUMN "school_type" "SchoolType" NOT NULL DEFAULT 'DAY';

-- AlterTable: pricing snapshot fields. `plan` already existed (now holds the
-- auto-resolved tier name, e.g. "Standard", instead of a client-chosen
-- value). These three new columns record the numbers that actually produced
-- the charge at the time this subscription was created/paid, since a
-- school's live student count (and therefore its tier/price) can change
-- after the fact. All nullable — existing subscription rows predate this
-- pricing model and have no meaningful values for them.
ALTER TABLE "subscriptions"
  ADD COLUMN "amount_kes" INTEGER,
  ADD COLUMN "student_count" INTEGER,
  ADD COLUMN "school_type" "SchoolType";
