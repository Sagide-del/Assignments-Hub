ALTER TABLE "MasterModule" ADD COLUMN "batch_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "theory_cheatsheet" JSONB NOT NULL DEFAULT '{}';
-- Number historical records without rewriting or deleting their content.
WITH numbered AS (
 SELECT id, ROW_NUMBER() OVER (PARTITION BY grade, lower(btrim(subject)), lower(btrim(topic)) ORDER BY created_at, id)::integer AS n FROM "MasterModule"
) UPDATE "MasterModule" m SET batch_number=n.n FROM numbered n WHERE m.id=n.id;
ALTER TABLE "MasterModule" ADD CONSTRAINT "MasterModule_positive_batch" CHECK(batch_number>0);
CREATE UNIQUE INDEX "MasterModule_topic_batch_key" ON "MasterModule"(grade,lower(btrim(subject)),lower(btrim(topic)),batch_number);
CREATE FUNCTION ah_assign_master_batch_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array(NEW.grade,lower(btrim(NEW.subject)),lower(btrim(NEW.topic)))::text,0));
 IF NEW.batch_number=1 THEN
  SELECT COALESCE(MAX(batch_number),0)+1 INTO NEW.batch_number FROM "MasterModule"
  WHERE grade=NEW.grade AND lower(btrim(subject))=lower(btrim(NEW.subject)) AND lower(btrim(topic))=lower(btrim(NEW.topic));
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "MasterModule_assign_batch_number" BEFORE INSERT ON "MasterModule" FOR EACH ROW EXECUTE FUNCTION ah_assign_master_batch_number();
