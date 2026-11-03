# Legacy bank migration and enrichment

## Source and preservation

`QuestionBank` (`question_bank`) is the canonical bank in this schema. `Question` rows belong to delivered assignments; migrating those as well would duplicate bank questions and mix delivery/submission history into the content repository. Existing assignments, submissions, questions, source documents and batches remain untouched.

The script groups Grade 6–12 bank records by numeric grade, trimmed subject and topic **and ownership scope**. School-owned rows cannot be merged with global content or another school's content. Unclassifiable grades or ambiguous ownership stop the entire transaction instead of dropping records. Every source row, including original approval status, batch IDs, dates, HTML, diagrams, type, matching options and private grading config, is retained in `content_json.legacy_records`. The normalized `questions` array includes original IDs. Null answers stay null; no answers are invented. Sets below or above 30 are never padded or truncated.

Modules have `APPROVED` status as requested, with `content_json.source = LEGACY`, placeholder theory and empty equations. They are **not published** automatically. Original question statuses remain in the snapshot and are printed in the plan, so review any generated/rejected source material before publication.

## Dry-run first

Run from `backend` in the environment that has the source database configured. Supply `DATABASE_URL` through the environment; do not paste credentials into chat or commit them.

```sh
npm run cms:migrate-legacy -- --dry-run
```

The default without flags is also dry-run. PostgreSQL enforces a read-only transaction. Logs show grade, subject, topic, ownership, question count, original statuses and deterministic destination ID. Final totals distinguish planned/created modules, source questions and existing modules skipped. CMS schema must already exist.

After inspecting the real source plan and explicitly approving execution:

```sh
npm run cms:migrate-legacy -- --execute
```

Do not execute this command until the owner approves the dry-run. Writes are additive and atomic. Deterministic module IDs prevent duplicate imports; unchanged snapshots skip on reruns, including enriched modules. A changed source snapshot or ID collision aborts rather than overwriting saved content. New legacy records after the first import therefore require a deliberate follow-up migration, not an implicit merge. Keep normal database backups before any approved production data migration.

## Admin workflow

Content Library → Approved → Legacy content only → open module → **Enrich with AI**. The existing router generates 300 words of theory and exactly `max(0, 30 - current question count)` new questions. All originals, snapshots and source metadata remain. Sets already above 30 receive theory and zero new questions. New material is validated, duplicate prompts rejected and token totals incremented. Concurrent edits cause a conflict rather than overwriting approval/publication. The enriched result returns to Draft for review. No enrichment happens at student login and no AI provider is called by migration or student delivery.

## Student delivery

Only published modules for the learner's grade appear under My Assignments → Learning library. School modules additionally require matching tenant and selected stream/class, with an active school subscription; the existing trial guard blocks trial access. The catalogue contains metadata only. Opening a module creates/reuses a standard Assignment with learner-safe CMS metadata and relational Question rows, preserving original grading types/config. It then opens the existing exam workspace, using its draft/submission/results lifecycle. This is an additive delivery snapshot; later CMS changes do not rewrite historic learner submissions.

Legacy placeholder theory is hidden. Sets below 30 show **Practice Set (Partial)**. Empty equations render nothing; present equations use KaTeX with untrusted commands disabled and sanitized output. Full sets are called Practice Set, not presented as an official full mock merely because they contain 30 questions. School-owned content cannot be republished globally or to another tenant.

## Verification in this workspace

- Source database dry-run attempted: no DATABASE_URL in checkout; existing local configuration points to an unavailable server at `127.0.0.1:5432`. **No real-source counts verified and no source data migrated.**
- Disposable localhost PostgreSQL fixture: 45 canonical questions across two topics (10 and 35). Dry-run made no writes; fixture execution produced two modules without truncation; rerun skipped both; all 45 original rows remained. Delivery retained essay grading config and idempotently reused an assessment. These are fixture results, not production counts.
- Targeted CMS unit/HTTP/PostgreSQL checks cover mapping, enrichment, token accounting, auth, publication and delivery.

Final targeted verification: 42 backend CMS/submission tests passed with disposable PostgreSQL; 27 frontend CMS/assignment tests passed; frontend and backend production builds passed. Chromium verified the legacy filter, enrichment refresh, partial exam workspace, hidden theory placeholder and mobile layout. Existing unrelated Question Bank CI failures remain outside this migration and can still block release.
