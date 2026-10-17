-- Existing accounts remain paid/full-access by default; only new
-- self-registered independent learners begin with restricted trial access.
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_independent_trial" BOOLEAN NOT NULL DEFAULT false;
