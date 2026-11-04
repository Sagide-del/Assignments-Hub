# Production RBAC release: target 2b3d5af

## Current status

**Production verification is not implied by a Git merge or successful build.** No production database, Render credential/session or usable GitHub API credential is connected directly to this workspace. The owner can use Render Shell to execute the checked commands without sharing credentials. HTTPS requests to assignmenthub.co.ke and assignments-hub-api.onrender.com are rejected by the workspace proxy (HTTP 403); this is not evidence of an application RBAC response. The existing GitHub AWS OIDC deployment can be used once its verification configuration is populated. Do not deploy the SBA module until this release is verified.

The existing `/workspace/artifacts/teacher-test-login.txt` is explicitly local-only. It is not a production credential confirmation.

## Controlled release sequence

1. Connect production database/service access securely, permit the live API/frontend and GitHub API hosts, and ensure a known previous frontend is recoverable. Never copy a local .env into production. Inspect the intended deployment diff: 2b3d5af includes earlier taxonomy, pricing and callback commits as ancestors.
2. Merge the reviewed feature branch into main. Existing Render automation is configured in render.yaml to build and run `npx prisma migrate deploy`. Check the real service configuration rather than assuming a Git push completed deployment. Do not run `prisma db push`, `prisma migrate dev` or the general seed on production.
3. In the production backend, run `npx prisma migrate deploy` only. Verify its successful migration output. Run `node dist/src/scripts/operations/demo-academy.js` without `--apply` to inspect the actual TeacherAssignment indexes and tenant foreign keys. It requires the primary key, unique teacher/subject/stream index, school/teacher index and both composite tenant foreign keys.
4. Set `DEMO_TEACHER_PASSWORD` securely to the password supplied by the owner. Run `node dist/src/scripts/operations/demo-academy.js --apply`. It provisions only Demo Academy (`DEMO-001`), Mr. Otieno (`otieno@demo.co.ke`), Grade 11 streams 1A/1B, Aviation Technology → 1B, Victor Halisi (VH001/1B) and Alice Wanjiru (AW002/1A). Grade 11 follows the preceding teacher RBAC scenario. Both learner profiles are STEM and have active Technical and Engineering track selections.
5. The STEM pathway must exist. If the exact Technical and Engineering track is absent, the script creates an unpublished, explicitly synthetic demo reference used by these two test learners only. It does not rename Technical Studies, publish placeholder curriculum, reseed the catalogue or rewrite existing selections. A conflicting demo-reference key or a missing STEM pathway stops the transaction.
6. Save the provisioning report. It includes Alice's numeric user ID under `students.AW002`. Configure GitHub repository variable `RBAC_DEMO_ALICE_ID` with that ID and secret `RBAC_DEMO_TEACHER_PASSWORD` with the supplied temporary password. The password is not committed, printed by provisioning, or stored in deployment artifacts. Re-running provisioning validates the existing account and permissions without resetting passwords, changing enrolments, deleting history or creating duplicates. Conflicting/unrelated accounts stop the transaction.
7. Trigger frontend deployment after the backend and fixture are ready. The workflow uses `publish-verified-rbac.sh`: before writing S3 it verifies API scope and saves a snapshot matching the current public homepage. After publishing it checks API access, real browser login, the My classes dropdown, Victor/Alice visibility and existing first-aid assets. Failure restores the snapshot and invalidates CloudFront. It verifies that the previous homepage is restored; if rollback cannot be verified, the job fails and preserves the snapshot in the recovery artifact rather than reporting success. No post-failure SBA work is permitted.
8. Confirm the successful GitHub run, live verification JSON and teacher screenshot. The intended production-only login is school DEMO-001, staff email otieno@demo.co.ke and the owner-supplied temporary password. Do not assert that login works before live evidence succeeds. AHTEST credentials remain a separate local account.

## Verification commands

With secrets supplied through the environment, from the repository root:

```
node scripts/deployment/verify-rbac-live.mjs
node scripts/deployment/verify-rbac-browser.cjs
```

The API script also requires `RBAC_ALICE_ID`. Browser verification requires Playwright + Chromium; CI installs an isolated, pinned browser dependency without adding it to the production backend. API verification is read-only except for normal login/session/audit records. Tokens/passwords are never logged. Use HTTPS in production. Loopback overrides require the explicit `RBAC_LOCAL_TEST=true` test flag and are never production evidence.

## Checks completed locally

All 59 migrations were applied successfully using `prisma migrate deploy` against a fresh isolated PostgreSQL database. The taxonomy seed was separately executed twice against a local test database: the second run performed zero inserts/updates, and a curated record's ID, contents, verification status and timestamps were unchanged. No taxonomy seed was run in production. The startup `prestart:prod` uses this verified insert-only implementation; the manual migration/provisioning commands above do not invoke it.

Tests cover the exact fixture, password preservation, reruns, tenant indexes/FKs, unrelated-account refusal and unchanged taxonomy. Frontend rollback tests simulate API failure, browser failure, initial verification failure, snapshot mismatch and rollback failure with mocked AWS commands; they make no live AWS writes. Local browser/API success must not be labelled production verification.
