BEGIN;
ALTER TABLE "users" ADD COLUMN "skill_interest" TEXT;
ALTER TABLE "skill_lesson_progress" ADD COLUMN "evidence" JSONB;
ALTER TABLE "skill_lesson_progress" ADD COLUMN "review_after" TIMESTAMP(3);

INSERT INTO "skill_categories" ("name","description","icon","display_order","status","created_at","updated_at") VALUES ('Music & Audio','Original music, production and arrangement.','Music',20,'PUBLISHED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("name") DO NOTHING;
INSERT INTO "skill_providers" ("name","description","verified","status","created_at","updated_at") VALUES ('Assignment Hub Learning Studio','Platform-authored practical learning.',true,'PUBLISHED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("name") DO NOTHING;
INSERT INTO "skill_courses" ("category_id","provider_id","title","short_description","full_description","duration_weeks","level","cost_kes","certificate_available","learning_outcomes","course_structure","status","created_at","updated_at") SELECT c.id,p.id,'Music Production Foundations','Create and revise a 30–60 second original instrumental track.','Create and revise a 30–60 second original instrumental track. Learn through worked examples, deliberate practice and a different transfer task.',4,'BEGINNER',0,false,'["Keep an even pulse and build a four-bar phrase.", "Create contrasting drum patterns without filling every step.", "Use repetition and small variations to create an original phrase.", "Hear how a chord supports a melody rather than competing with it.", "Arrange an introduction, a main section and an ending.", "Produce an original short track and evaluate it against a brief."]'::jsonb,'["Pulse, tempo and bars", "Build a groove with space", "Write a memorable melody", "Match chords and melody", "Turn a loop into a track", "Mix, export and explain"]'::jsonb,'PUBLISHED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "skill_categories" c CROSS JOIN "skill_providers" p WHERE c.name='Music & Audio' AND p.name='Assignment Hub Learning Studio' AND NOT EXISTS (SELECT 1 FROM "skill_courses" x WHERE x.title='Music Production Foundations' AND x.provider_id=p.id);
INSERT INTO "skill_courses" ("category_id","provider_id","title","short_description","full_description","duration_weeks","level","cost_kes","certificate_available","learning_outcomes","course_structure","status","created_at","updated_at") SELECT c.id,p.id,'Songwriting & Arrangement','Create and revise a 45–90 second original song or instrumental story.','Create and revise a 45–90 second original song or instrumental story. Learn through worked examples, deliberate practice and a different transfer task.',4,'BEGINNER',0,false,'["Create an original hook that fits a clear musical brief.", "Place natural word stresses over a steady musical pulse.", "Compare two simple chord choices under the same hook.", "Use contrast and repetition to organise a short song.", "Record and compare two intentional vocal takes.", "Export a short song and explain how you improved it."]'::jsonb,'["Find your hook", "Fit words to rhythm", "Choose supporting harmony", "Shape verse and chorus", "Record a clear vocal", "Finish your original song"]'::jsonb,'PUBLISHED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "skill_categories" c CROSS JOIN "skill_providers" p WHERE c.name='Music & Audio' AND p.name='Assignment Hub Learning Studio' AND NOT EXISTS (SELECT 1 FROM "skill_courses" x WHERE x.title='Songwriting & Arrangement' AND x.provider_id=p.id);

-- Preserve work and payment entitlements while bringing legacy enrollments
-- under the two-active-skill rule. Keep learning with saved work first.
ALTER TABLE "skill_enrollments" ADD COLUMN "paused_at" TIMESTAMP(3);
ALTER TABLE "skill_enrollments" ADD COLUMN "pause_reason" TEXT;
WITH ranked AS (
  SELECT e.id, ROW_NUMBER() OVER (PARTITION BY e.student_id ORDER BY
    (e.status = 'ACTIVE') DESC,
    (SELECT MAX(p.updated_at) FROM skill_lesson_progress p WHERE p.enrollment_id=e.id) DESC NULLS LAST,
    e.requested_at DESC, e.id DESC) AS position
  FROM skill_enrollments e WHERE e.status IN ('ACTIVE','REQUESTED','AWAITING_PAYMENT')
)
UPDATE skill_enrollments e SET status='CANCELLED', paused_at=CURRENT_TIMESTAMP,
  pause_reason='Two-skill focus limit; previous status: ' || e.status::text
FROM ranked r WHERE e.id=r.id AND r.position>2;

COMMIT;
