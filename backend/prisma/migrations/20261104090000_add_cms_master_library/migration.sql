-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED_STORE', 'PUBLISHED_SCHOOL', 'ARCHIVED');

-- CreateTable
CREATE TABLE "MasterModule" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "pathway" TEXT,
    "track" TEXT,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT,
    "generation_cost_tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MasterModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleAssignment" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),

    CONSTRAINT "ModuleAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ModuleAssignment" ADD CONSTRAINT "ModuleAssignment_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "MasterModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

