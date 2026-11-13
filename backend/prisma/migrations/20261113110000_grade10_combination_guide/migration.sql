-- CreateTable
CREATE TABLE "moe_combinations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pathway" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "subjects" TEXT[],
    "source_url" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moe_combinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade10_combination_choices" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "combination_id" TEXT,
    "track_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade10_combination_choices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moe_combinations_code_key" ON "moe_combinations"("code");

-- CreateIndex
CREATE INDEX "moe_combinations_is_verified_pathway_track_idx" ON "moe_combinations"("is_verified", "pathway", "track");

-- CreateIndex
CREATE UNIQUE INDEX "grade10_combination_choices_student_id_key" ON "grade10_combination_choices"("student_id");

-- CreateIndex
CREATE INDEX "grade10_combination_choices_school_id_idx" ON "grade10_combination_choices"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade10_combination_choices_student_id_school_id_key" ON "grade10_combination_choices"("student_id", "school_id");

-- AddForeignKey
ALTER TABLE "grade10_combination_choices" ADD CONSTRAINT "grade10_combination_choices_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade10_combination_choices" ADD CONSTRAINT "grade10_combination_choices_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "moe_combinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade10_combination_choices" ADD CONSTRAINT "grade10_combination_choices_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A shortlist is either a reviewed combination or an exploration track.
ALTER TABLE "grade10_combination_choices" ADD CONSTRAINT "grade10_choice_one_target" CHECK (("combination_id" IS NOT NULL)::int + ("track_id" IS NOT NULL)::int = 1);
