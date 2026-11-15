-- Add metadata only. No historical acquisition is inferred or backfilled.
ALTER TABLE "users" ADD COLUMN "landing_source" VARCHAR(120);
ALTER TABLE "independent_tuma_payments" ADD COLUMN "landing_source" VARCHAR(120);
ALTER TABLE "independent_jenga_payments" ADD COLUMN "landing_source" VARCHAR(120);
ALTER TABLE "Payment" ADD COLUMN "landing_source" VARCHAR(120);
