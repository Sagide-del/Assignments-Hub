-- CreateTable
CREATE TABLE "Study_Timetable" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "plan_json" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generation_token" TEXT,
    "generation_started_at" TIMESTAMP(3),
    "generation_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Study_Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study_School_Schedule" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT '',
    "blocks_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Study_School_Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Study_Timetable_school_id_week_start_idx" ON "Study_Timetable"("school_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "Study_Timetable_student_id_week_start_key" ON "Study_Timetable"("student_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "Study_School_Schedule_school_id_grade_stream_key" ON "Study_School_Schedule"("school_id", "grade", "stream");

-- AddForeignKey
ALTER TABLE "Study_Timetable" ADD CONSTRAINT "Study_Timetable_student_id_school_id_fkey" FOREIGN KEY ("student_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study_Timetable" ADD CONSTRAINT "Study_Timetable_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study_School_Schedule" ADD CONSTRAINT "Study_School_Schedule_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Study_Timetable" ADD CONSTRAINT "Study_Timetable_monday_check" CHECK (EXTRACT(ISODOW FROM week_start)=1), ADD CONSTRAINT "Study_Timetable_generation_count_check" CHECK(generation_count>=0);
