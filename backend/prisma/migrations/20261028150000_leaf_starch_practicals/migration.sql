INSERT INTO "labs" ("key", "title", "subject", "grade", "topic", "topic_area", "description", "duration_minutes", "is_published", "createdAt", "updatedAt")
SELECT 'starch-test-grade-' || g::text || '-v1', 'Leaf starch test · interactive practical', 'Biology', 'Grade ' || g::text, 'Photosynthesis', 'Plant nutrition', 'Compare prepared light-grown and dark-control leaves. Boil in water, decolourise in an off-flame ethanol water bath, rinse and test with iodine.', 45, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM generate_series(10, 12) AS g ON CONFLICT ("key") DO NOTHING;
