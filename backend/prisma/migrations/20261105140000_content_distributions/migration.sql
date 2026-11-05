BEGIN;
CREATE TABLE "ContentDistribution" (
 "id" TEXT NOT NULL, "module_id" TEXT NOT NULL, "audience" TEXT NOT NULL,
 "school_id" TEXT, "stream_id" TEXT, "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ContentDistribution_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ContentDistribution_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "MasterModule"("id") ON DELETE CASCADE,
 CONSTRAINT "ContentDistribution_audience_check" CHECK ((audience = 'PUBLIC_STORE' AND school_id IS NULL AND stream_id IS NULL) OR (audience = 'SCHOOL' AND school_id IS NOT NULL))
);
CREATE INDEX "ContentDistribution_module_id_idx" ON "ContentDistribution"("module_id");
CREATE INDEX "ContentDistribution_audience_school_id_stream_id_idx" ON "ContentDistribution"("audience", "school_id", "stream_id");
CREATE UNIQUE INDEX "ContentDistribution_destination_key" ON "ContentDistribution" (module_id, audience, COALESCE(school_id,''), COALESCE(stream_id,''));
INSERT INTO "ContentDistribution" (id,module_id,audience,published_at)
 SELECT md5(id || ':store'),id,'PUBLIC_STORE',updated_at FROM "MasterModule" WHERE status::text = 'PUBLISHED_STORE';
INSERT INTO "ContentDistribution" (id,module_id,audience,school_id,stream_id,published_at)
 SELECT md5(m.id || ':school:' || COALESCE(a.stream_id,'')),m.id,'SCHOOL',m.tenant_id,a.stream_id,COALESCE(a.published_at,m.updated_at)
 FROM "MasterModule" m LEFT JOIN "ModuleAssignment" a ON a.module_id=m.id
 WHERE m.status::text='PUBLISHED_SCHOOL' AND m.tenant_id IS NOT NULL ON CONFLICT DO NOTHING;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "MasterModule" WHERE status::text='PUBLISHED_SCHOOL' AND tenant_id IS NULL) THEN
 RAISE EXCEPTION 'School publication has no tenant; repair ownership before migration'; END IF;
END $$;
UPDATE "MasterModule" SET status='APPROVED' WHERE status::text IN ('PUBLISHED_STORE','PUBLISHED_SCHOOL');
ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT','APPROVED','ARCHIVED');
ALTER TABLE "MasterModule" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "MasterModule" ALTER COLUMN status TYPE "ContentStatus" USING status::text::"ContentStatus";
ALTER TABLE "MasterModule" ALTER COLUMN status SET DEFAULT 'DRAFT';
DROP TYPE "ContentStatus_old";

COMMIT;
