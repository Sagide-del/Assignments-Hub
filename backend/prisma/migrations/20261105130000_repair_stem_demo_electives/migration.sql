-- Repair only the named synthetic account and never overwrite chosen electives.
UPDATE "users" SET "elective_subjects"=ARRAY['Biology','Chemistry','Physics']::TEXT[]
WHERE "role"='STUDENT' AND "name"='STEM Demo Learner' AND "grade"='Grade 10'
AND "admission_number"='STEM1001' AND cardinality("elective_subjects")=0
AND "school_id" IN (SELECT id FROM "schools" WHERE code='STEM10TEST');
