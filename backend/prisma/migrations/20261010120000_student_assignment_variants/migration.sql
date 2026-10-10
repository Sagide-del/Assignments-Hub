-- Additive learner-specific question delivery. Existing assignment,
-- question, submission and answer records are unchanged.
CREATE TABLE "assignment_delivery_configs" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "question_count" INTEGER NOT NULL,
    "pool_size" INTEGER NOT NULL,
    "shuffle_options" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assignment_delivery_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_assignment_variants" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "question_ids" INTEGER[] NOT NULL,
    "option_orders" JSONB,
    "total_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_assignment_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assignment_delivery_configs_assignment_id_key"
ON "assignment_delivery_configs"("assignment_id");

CREATE INDEX "assignment_delivery_configs_school_id_enabled_idx"
ON "assignment_delivery_configs"("school_id", "enabled");

CREATE UNIQUE INDEX "student_assignment_variants_assignment_id_student_id_key"
ON "student_assignment_variants"("assignment_id", "student_id");

CREATE INDEX "student_assignment_variants_school_id_student_id_created_at_idx"
ON "student_assignment_variants"("school_id", "student_id", "created_at");

ALTER TABLE "assignment_delivery_configs"
ADD CONSTRAINT "assignment_delivery_configs_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_delivery_configs"
ADD CONSTRAINT "assignment_delivery_configs_assignment_id_fkey"
FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_assignment_variants"
ADD CONSTRAINT "student_assignment_variants_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_assignment_variants"
ADD CONSTRAINT "student_assignment_variants_assignment_id_fkey"
FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_assignment_variants"
ADD CONSTRAINT "student_assignment_variants_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
