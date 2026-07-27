-- CreateTable: "messages" — direct messaging between a school's students
-- and teachers, replacing the old "My Activity" tab. Brand new table, no
-- existing column/table changes, so this is purely additive and safe to run
-- against the live database ahead of deploying the new backend code.
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_school_id_idx" ON "messages"("school_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_recipient_id_idx" ON "messages"("sender_id", "recipient_id");

-- CreateIndex
CREATE INDEX "messages_recipient_id_sender_id_idx" ON "messages"("recipient_id", "sender_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
