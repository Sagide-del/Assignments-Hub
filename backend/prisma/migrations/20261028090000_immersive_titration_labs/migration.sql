-- Additive catalogue records. Existing teacher-authored labs and sessions are unchanged.
INSERT INTO "labs" ("key", "title", "subject", "grade", "topic", "topic_area", "description", "duration_minutes", "is_published", "createdAt", "updatedAt")
SELECT '3d-titration-grade-' || g::text || '-v1', 'Acid–base titration · 3D practical', 'Chemistry', 'Grade ' || g::text, 'Acids, bases and salts', 'Physical Chemistry', 'Operate a burette and volumetric pipette, observe an indicator endpoint, record repeat titres and calculate an unknown concentration in an ideal 3D teaching model.', 45, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM generate_series(10, 12) AS g
ON CONFLICT ("key") DO NOTHING;
