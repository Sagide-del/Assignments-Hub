# Teacher stream access

Access is enforced in NestJS/Prisma query predicates. This is application row-level access control, not PostgreSQL session-based RLS.

## Data model and rollout

`Stream` is identified by school + grade + name. `TeacherAssignment` binds one teacher, subject and stream within the same school. Existing integer User/School IDs are retained. Composite foreign keys reject cross-school assignments even outside the API.

Migration `20261104220000_teacher_stream_rbac` adds the models and catalogues existing student-profile stream labels. It does **not** infer teacher permissions from free-text `assignedClass`. School admins must explicitly assign classes. Teachers without assignments receive 403 for pupil-data routes. Student enrolment and student-facing API behavior are retained; a student without a matching grade/profile stream is never guessed into a teacher's roster.

Apply reviewed migrations, deploy the backend, configure teacher assignments and publish the frontend. The frontend deployment workflow now verifies the schema-backed `/teacher/capabilities` response before upload, and runs real PostgreSQL RBAC tests. It does not silently deploy a new UI against an older backend. No production migration or deployment was performed from this workspace.

## Routes

- `GET /teacher/classes`: assigned subject/stream pairs.
- `GET /teacher/students`: school + assigned grade/stream pairs.
- `GET /teacher/results`, `/teacher/sba`: exact subject AND grade/stream pairs.
- `GET /teacher/assignments`: only the teacher's authored assignments.
- `GET /admin/teachers`: teachers and assignments in the school admin's school.
- `POST /admin/teachers/:id/assignments`: `{ subject, stream_id }`.
- `DELETE /admin/teachers/:id/assignments/:assignmentId`: revoke within the school.
- `GET/POST /admin/streams`: catalogue/create a school stream.

School admins retain school-wide permissions. Platform admins can view all schools through teacher data routes or select `schoolId`. The school-admin assignment manager deliberately operates within the authenticated school. Query/body overrides never broaden a teacher's scope. Permission data is fetched from storage each request, not trusted from a JWT; revocations are effective on subsequent requests.

Older teacher-accessible routes are also restricted: user lists/detail, submissions/marking, academic reports and PDF analysis, SBA review, analytics, lab/CSL records, messages, parent SMS, pathway/talent/support records. Result-batch counts and errors are sanitized to avoid disclosing other streams. Staff report-card submission subjects remain scoped. New teacher assignments require a valid subject-stream pair; omitting a stream resolves only when exactly one match exists, otherwise it is rejected.

## UI

Teacher: **My teaching** includes a class selector, scoped learner list, recent assignments, marking queue and teaching tools. The assignment builder offers the same pairs. An unassigned teacher sees the requested contact-admin message. School admin: **Teaching assignments** adds/removes pairs and creates streams. Client cache keys include the current user/tenant where new data is introduced.

## Test credentials

A synthetic `AHTEST` school was provisioned only in the local test database, with a Grade 11 Aviation teacher, stream 1B and three fictional learners. The generated password is in the private delivery artifact, never committed. The full backend staff-login flow and scoped data requests were verified. These credentials do not exist on the live site.

To provision that school on another configured database, after migrations:

```
npm run seed:teacher-demo -- --apply
```

This explicit script creates the school only if `AHTEST` does not exist; it never resets an existing account. It generates and prints a random password (or accepts a secure `TEACHER_DEMO_PASSWORD` of 16–72 characters). Do not run it automatically on startup or reuse a public/default password. Staff login uses school code `AHTEST` and email `teacher@assignmenthub.test`.

## Verification

`RBAC_TEST_DATABASE_URL` is opt-in and restricted to a disposable `127.0.0.1/rbac_test` database. Run `npm test -- --runInBand src/__tests__/rbac.spec.ts src/teacher-scope`. HTTP tests use real JWT guards, Prisma and PostgreSQL; they cover school/stream isolation, direct IDs, revocation, subject pairing and retained student/admin behavior. Never point test fixtures at production. Browser checks cover desktop/mobile, class selection, errors/empty states and school-admin assignment management.
