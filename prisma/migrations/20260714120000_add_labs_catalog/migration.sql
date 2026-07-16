-- CreateEnum
CREATE TYPE "LabType" AS ENUM ('SIMULATION', 'PRACTICAL');

-- CreateTable
CREATE TABLE "labs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "competency" TEXT,
    "description" TEXT,
    "type" "LabType" NOT NULL DEFAULT 'SIMULATION',
    "resource_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "labs_key_key" ON "labs"("key");

-- AddForeignKey
ALTER TABLE "labs" ADD CONSTRAINT "labs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
