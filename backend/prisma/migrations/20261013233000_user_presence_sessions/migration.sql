-- CreateEnum
CREATE TYPE "PresenceDeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN');

-- CreateTable
CREATE TABLE "user_presence_sessions" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "device_type" "PresenceDeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "current_path" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presence_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_presence_sessions_session_id_key" ON "user_presence_sessions"("session_id");

-- CreateIndex
CREATE INDEX "user_presence_sessions_last_seen_at_idx" ON "user_presence_sessions"("last_seen_at");

-- CreateIndex
CREATE INDEX "user_presence_sessions_school_id_last_seen_at_idx" ON "user_presence_sessions"("school_id", "last_seen_at");

-- CreateIndex
CREATE INDEX "user_presence_sessions_role_last_seen_at_idx" ON "user_presence_sessions"("role", "last_seen_at");

-- CreateIndex
CREATE INDEX "user_presence_sessions_user_id_last_seen_at_idx" ON "user_presence_sessions"("user_id", "last_seen_at");

-- AddForeignKey
ALTER TABLE "user_presence_sessions" ADD CONSTRAINT "user_presence_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence_sessions" ADD CONSTRAINT "user_presence_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
