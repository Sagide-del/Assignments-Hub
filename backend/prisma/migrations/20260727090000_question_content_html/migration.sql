-- AlterTable: adds an optional rich-HTML body to "questions" for the new
-- teacher Rich Editor (math/chemistry equations via KaTeX, embedded images,
-- labeled diagrams). Nullable, no default needed — purely additive. Every
-- existing row gets NULL here and every existing render path already falls
-- back to the plain "question_text" column when this is NULL, so this is
-- safe to run against the live database ahead of deploying the new backend
-- code (old code simply never reads/writes this column).
ALTER TABLE "questions"
  ADD COLUMN "content_html" TEXT;
