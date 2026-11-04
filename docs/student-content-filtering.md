# Student curriculum filtering

Student content is scoped server-side to the learner's current database grade, recorded pathway and active matching track. JWT/query/body grade claims cannot widen access. Grades 1–9 ignore senior pathway/track selections. A missing senior pathway or track only unlocks shared core subjects, with an explicit setup prompt.

`StudentScopeService.getStudentScope(student_id, school_id)` reads User, StudentProfile and the active StudentPathwaySelection → Track → Pathway. A school-recorded profile pathway takes priority over a conflicting exploratory selection; an inconsistent track is not used. Existing CurriculumTaxonomy rows define track subjects; verified CurriculumScope subjects supplement junior coverage. Shared Math, English, Kiswahili and senior PE/CSL remain available; Technical/Engineering includes Physics as a shared STEM subject. This uses the configured curriculum catalogue and does not claim that a sparse catalogue proves complete official coverage.

## Existing routes

A student-only global guard and response interceptor cover the existing assignments, submissions, practice batches, KJSEA mocks, labs/lab-session submissions, skills/enrolments/progress, resources/downloads, recall cards, STEM taxonomy and Learning Coach routes. Direct out-of-scope requests return 403 before writes. Existing publishing, school, stream, subscription, trial and ownership checks still execute. Staff return before student scope resolution; no teacher/admin or CMS authoring endpoints were modified.

CMS student catalogue/start routes are filtered from outside the CMS module. Delivered assignments carrying `rawJson.cms_module_id` are checked against the source module's scope, publication and audience. Catalogue reads return metadata, never question answers or private theory. Timetable generation and recall quiz lookup use the same curriculum scope.

## Compatibility

The repository has separate Assignment, KjseaMockAttempt, Lab and SkillCourse delivery tables. It has no MasterModule `content_type` column. New student facades (`/student/assignments`, `/student/mocks`, `/student/skills`, `/student/labs`, `/student/library`, `/library`) provide published MasterModule metadata filtered by `content_json.content_type`; existing question-only modules default to ASSIGNMENT. Existing student screens continue using their established delivery APIs, now filtered consistently. No schema migration is needed.

Legacy Lab.pathway sometimes stores a track label (e.g. Pure Sciences); the adapter interprets those existing labels without rewriting content. Skills accept explicit `courseStructure.curriculum` metadata with `{ grade | grades, subject, pathway, track }`. The ten platform-authored foundation course titles have explicit, reviewable curriculum bindings in `curated-skill-alignment.ts`. Unknown courses and resources lacking usable grade/subject alignment stay hidden; no content is deleted or guessed from a title. Explicit Audience grade bands are respected.

## Student experience

`GET /student/content-scope` returns only the authenticated learner's grade, pathway, track, subject list and eligible published lab/skill counts. Sidebar and dashboard use those counts; CSL remains Grade 10–12 only. Scope is refreshed on pathway selection and focus, and changed scope invalidates active content caches. Mock grade selection is locked to the current profile grade. Empty lab/skill views show a clear unpublished-content state. Senior learners without a track can confirm it through the existing pathway selector.

## Verification

`src/__tests__/filtering.spec.ts` exercises real PostgreSQL/JWT and existing controllers, including Technical/Pure/Grade 8 lists, direct URL denials, enrolment bypasses, publishing audiences, grade changes and unchanged school-admin responses. Frontend policy tests cover navigation availability and senior-only CSL. Browser checks cover actual conditional navigation/dashboard rendering, responsive layouts, the locked mock grade and empty/setup states. Deployment waits for `/student/content-capabilities` version 2 and performs read-only role checks before publication.

Legacy subject abbreviations (including Mathematic, Math/Maths, CRE/IRE/HRE and PE) normalise to canonical subjects. Normalisation does not bypass grade, pathway or track checks.
