ALTER TYPE "MpesaLedgerStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TABLE "Payment" ADD COLUMN "raw_payload" TEXT, ADD COLUMN "reconciliation_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Payment_status_created_at_reconciliation_after_idx" ON "Payment"("status", "created_at", "reconciliation_after");
CREATE FUNCTION protect_payment_raw_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.raw_payload IS NOT NULL AND NEW.raw_payload IS DISTINCT FROM OLD.raw_payload THEN
   RAISE EXCEPTION 'Payment raw_payload is immutable';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_raw_payload_immutable BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION protect_payment_raw_payload();

CREATE TABLE "MpesaRawCallbackEvent" (
 "id" TEXT NOT NULL, "legacy_tuma_id" INTEGER NOT NULL,
 "payload_hash" TEXT NOT NULL, "raw_payload" TEXT NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MpesaRawCallbackEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MpesaRawCallbackEvent_legacy_tuma_id_payload_hash_key" ON "MpesaRawCallbackEvent"("legacy_tuma_id", "payload_hash");
CREATE FUNCTION protect_mpesa_raw_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'M-Pesa raw callback audit events are append-only'; END;
$$;
CREATE TRIGGER mpesa_raw_event_immutable BEFORE UPDATE OR DELETE ON "MpesaRawCallbackEvent" FOR EACH ROW EXECUTE FUNCTION protect_mpesa_raw_event();
