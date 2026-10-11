-- Additive vector index for curriculum source chunks. Vectors are stored as
-- JSON so deployments do not depend on a PostgreSQL extension being enabled.
CREATE TABLE "question_bank_chunk_embeddings" (
    "id" SERIAL NOT NULL,
    "chunk_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "vector" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_chunk_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_bank_chunk_embeddings_chunk_id_key"
ON "question_bank_chunk_embeddings"("chunk_id");

CREATE INDEX "question_bank_chunk_embeddings_model_idx"
ON "question_bank_chunk_embeddings"("model");

ALTER TABLE "question_bank_chunk_embeddings"
ADD CONSTRAINT "question_bank_chunk_embeddings_chunk_id_fkey"
FOREIGN KEY ("chunk_id") REFERENCES "question_bank_source_chunks"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
