# Assignment Hub: implementation, SEO and login review

Review date: 5 November 2026. Scope: repository implementation, local builds, disposable PostgreSQL integration tests and browser checks. The live site and Render API reject connections from this workspace (proxy CONNECT 403). This is not evidence that the public website is down. Search Console, production database contents, real customer credentials and server access logs were not available. Deployment verification is recorded separately below.

## Changes in this update

### Student assignments

- Senior-school assignment eligibility uses the learner's saved elective subjects plus English, Kiswahili, Core Mathematics and Community Service Learning. Subject aliases are normalized. Cross-track electives are supported; a subject is not excluded merely because its taxonomy track differs from the learner's track.
- A senior learner with no saved electives receives no assignment subjects. There is no fallback to all subjects. Junior learners retain grade-based eligibility.
- A narrowly targeted migration fills the synthetic Grade 10 STEM Demo Learner's empty electives with Biology, Chemistry and Physics. Existing saved choices are preserved.
- CMS batches and existing assignment/practice sources now appear in one Subject → Topic → Assignment view. The separate top learning-library cards were removed. Counts are calculated from the same filtered data that produces the cards.
- Assignment cards show question count, due date and actual learner progress. CMS start requests open the existing assessment workspace rather than introducing a second answer/grading implementation.
- `Explore Library` links to `/library`, which redirects to the authenticated student library. The empty state says “No assignments available yet. Check back soon.”

### CMS creation and delivery

- Approval and publication are separate. `ContentStatus` is now DRAFT, APPROVED or ARCHIVED. Publishing leaves the module APPROVED.
- `ContentDistribution` stores independent PUBLIC_STORE and SCHOOL destinations. School delivery can target the whole grade within a school or selected stream labels. The module's grade still applies to whole-school delivery.
- Publication is additive: publishing a batch to a school does not remove its store destination or any earlier school/stream destination. Retries are idempotent, guarded by a module row lock and a database uniqueness index.
- Selected streams are validated against the target school's registered streams or current learner profiles for the module's grade. No destination is inferred from an unrelated school.
- Student catalogue, library, direct module access and assignment materialization use the distribution model. Student responses expose only public and applicable own-school distribution metadata, not other schools' deliveries. Public catalogue responses exclude answer payloads.
- The SQL migration atomically copies historical store, school-wide and stream-specific publications, then converts their statuses to APPROVED. Existing modules, questions and ModuleAssignment history are retained. A school publication without a tenant causes the migration to fail rather than silently discard access.
- A dry-run-first `src/scripts/migrate-distributions.ts` companion audits or repairs legacy statuses where applicable. The SQL migration performs the normal conversion automatically; do not rerun taxonomy seeds for this release.
- Published modules cannot be AI-enriched in place. This prevents an enrichment run from silently changing content students already received. Archive retains delivery history while hiding the module from students.

### CMS interface

- Content Library uses collapsible Grade → Subject → Topic folders with dated, numbered batches.
- Grade, subject, status and topic-search filters are available. Counts reflect filtered batches.
- Batches display question counts, approval state, store/school/stream badges, Publish, Review, Edit title and Archive actions. “Edit title” changes the topic label; this release does not introduce arbitrary JSON question editing.
- Public Store and School are separate checkboxes in the publishing dialog, so both can be selected. When two targets are selected, requests run sequentially. If the second fails, the first remains published; the error explicitly explains that retrying is safe. This is not an all-or-nothing cross-audience transaction.
- Admin list responses omit full question payloads and return counts; full content loads through the protected review endpoint.
- A deployment readiness check waits for the distribution API and migrated storage before publishing the new frontend.

### Math validation

Identical exact calculations are reused within one generation request. Cache keys include calculation type/expression and the proposed answer for equivalence checking. Nothing is shared across users or persisted as a new trust source. Unsupported calculations, mismatches and outages still retain their existing failure behavior. This avoids repeating Python work for duplicate expressions in one generated set. Real-process integration tests receive a realistic timeout; assertions were not removed. The Python worker wall-time allowance is five seconds, with its two-second CPU limit and memory limit retained, so interpreter/process scheduling on a busy machine has a little more headroom.

## Existing system functions observed

| Area | Current implementation |
| --- | --- |
| Accounts | School learners, independent learners, teachers, school administrators and platform administrator; tenant and role guards |
| Content authoring | Taxonomy-based AI drafts, strict JSON validation, token accounting, review/approval, enrichment of unpublished legacy modules |
| Curriculum | Grade/subject taxonomy plus source-ingestion and review tools; taxonomy labels alone are not proof of verified complete KICD outcome coverage |
| Assessment | Assignments, topic practice, saved submissions, grading/review and question-bank-based mock construction |
| Delivery | Grade/enrolled-subject scope, publication audiences and stream controls; saved batches remain reusable |
| Study support | Cheat sheets, illustrated recall cards, authenticated library, learning coach and weekly timetable |
| Practical learning | STEM workspaces and skill lessons; realism and curriculum completeness vary by activity and need separate content QA |
| Schools | Teacher stream/subject access controls, SBA projections, external mock imports and CSL tracking |
| Billing | Existing individual/school and Tuma payment modules; not altered or live-payment-tested in this update |

A feature's presence is not a claim that every grade/topic has reviewed content in production. The repository contains taxonomy for Grades 1–12 and registration also offers early-years options, whereas the original commercial focus was Grades 6–12. Decide which grades are actually supported before marketing complete coverage. Existing taxonomy tests report 127 entries and 551 topics, marked supplied data with official verification pending. These are not production question counts.

## SEO report

### What is already present

- Homepage title, description, canonical URL, Open Graph/Twitter tags and JSON-LD metadata.
- `robots.txt` and an XML sitemap.
- A static public About page and a generated public revision hub.
- Three public Grade 7 practice pages: mathematics fractions, mathematics algebra and integrated-science laboratory safety. Their questions and worked answers are present in HTML before JavaScript runs, with canonical metadata, learning-resource markup and breadcrumbs.
- Public revision works without registration and links to account creation, which is a useful acquisition route.

### Gaps and priorities

| Priority | Finding | Recommended action |
| --- | --- | --- |
| High | Homepage initial HTML contains an empty React root. Other SPA routes inherit the homepage canonical/metadata unless separately overridden. Google can render JavaScript, but initial HTML provides little page content. | Prerender public marketing routes with actual headings, copy, screenshots and route-specific metadata. Keep private student data protected. SSR for the entire authenticated app is unnecessary. |
| High | Only three public topic resources exist, all Grade 7. Most commercial value is behind authentication. | Publish reviewed public KJSEA mock, 3D STEM and school-pricing entry pages, followed by useful grade/subject pages for supported content. Avoid automatically publishing thin pages for empty grades. |
| Medium | Sitemap includes `/login`; global SPA metadata says index/follow. | Remove login from the sitemap and add route-appropriate noindex metadata for login, registration and private workspaces. Authentication remains the security boundary; robots is not access control. |
| Medium | Frontend build reports large chunks, including roughly a 1 MB uncompressed main JS bundle and a substantial 3D dependency chunk. | Keep 3D/editor dependencies out of the initial public-page path, optimize real screenshots and measure mobile LCP/INP/CLS with field data. Bundle size alone is not a Core Web Vitals score. |
| Medium | Social preview uses the logo rather than a product-oriented share image. | Produce an optimized branded preview with a real product screenshot and descriptive alt text where applicable. |
| Medium | Coverage/indexing and conversion evidence are unavailable in this workspace. | Check Search Console Pages, indexed canonical URLs, sitemap status, queries and mobile page experience. Track landing → registration → activation without collecting learner answers in marketing analytics. |

The earlier screenshot's 5 clicks / 35 impressions / 14.3% CTR / position 5.2 is a very small historical sample. It does not establish current rankings, demand or growth. No new Search Console report was accessible. Do not buy links or expose private answer banks just to improve indexing. Accurate public samples and useful curriculum-specific pages are the practical next step.

SEO was audited in this release; these SEO recommendations have not been implemented as part of the assignment/CMS change.

## Login and registration report

### Correct entry points

| Account | Entry | Required details / result |
| --- | --- | --- |
| School learner | `/login`, School student, or school-specific login URL | School code, admission number and school-issued PIN for PIN-enabled accounts; student workspace |
| Individual learner | `/login`, Individual | Username/email (legacy student identifiers supported) and password; student workspace |
| Teacher | `/login?account=staff` | School code, staff email and password; teacher portal |
| School administrator | `/login?account=staff` | School code, administrator email and password; school-admin portal |
| Platform owner | `/platform-console` | Platform account's own school code, email and password; platform console only for PLATFORM_ADMIN |

Registration creates an individual learner account, not a platform administrator. For Grades 10–12 the current form collects pathway, track and three elective choices. Account creation and elective saving are separate API operations; if subject saving fails after account creation, the account can exist without electives. The student can use Manage subjects to finish setup; the new assignment logic safely shows no assignments until subjects are saved. Successful signup does not itself prove payment activation.

### Protections present

- Password/PIN verification uses bcrypt; independent registration hashes with cost 12.
- Login endpoints have a 10-per-minute throttle; independent registration has 5-per-minute throttling, with global limits also configured.
- DTO validation rejects unknown fields and validates required inputs. UI errors are displayed without treating validation errors as proof of an attack.
- Access tokens and rotating refresh tokens are used. Refresh tokens are stored hashed on the server; reuse revokes sessions. Active/subscription checks exist in the appropriate login/refresh flow.
- The frontend has one shared session store and a single-flight refresh mechanism within a browser tab.
- API role/tenant restrictions remain necessary even for the hidden platform-console URL. A hidden URL is not a security control.

### Risks to address in a separate Auth change

1. **Legacy PIN-free school accounts:** accounts without a stored hash can still authenticate with school code and admission number. Migrate these accounts to mandatory issued PINs, with school-controlled resets and a clear transition plan.
2. **Browser token storage:** access and refresh tokens persist in localStorage, so successful XSS could read them. Evaluate Secure/HttpOnly refresh cookies with CSRF/CORS protections appropriate to the frontend/API deployment; do not merely swap storage without the corresponding backend design.
3. **Cross-tab refresh race:** single-flight protection is per tab. Two tabs can submit the same rotating token. The backend's issue/revoke sequence is also not one atomic rotation transaction. Coordinate tabs and make server rotation atomic before treating every race as theft.
4. **Transient refresh failures:** the current client clears the session on any refresh failure, including network/server errors. This can explain apparently random logout during an outage. Distinguish temporary connectivity from invalid/revoked credentials.
5. **Recovery and MFA:** the main login tells learners to contact their school. No complete self-service password recovery or platform-admin MFA flow was established by this review. Prioritize owner/staff MFA and a verified recovery process.
6. **Enumeration and audit completeness:** confirm uniform login error responses, account-lockout policy and successful/failed login auditing across every account type using a dedicated security test pass. Existing rate limits alone do not establish resistance to distributed attacks.
7. **Inactive/expired accounts:** subscription expiry or deactivation can legitimately prevent access; show clear next actions while keeping authentication distinct from payment activation.

I found no evidence in the supplied messages alone that the site is under attack. A security conclusion requires production audit/access logs and session-event review. No passwords were reset, no credentials were printed, and no real payment was initiated during this update.

## Operational notes

- M-Pesa/Tuma, Teacher RBAC, SBA and Auth implementation files were not changed. Tests covering those areas are included in verification.
- Back up the production database before schema changes. The distribution migration does not delete learning data, but enum contraction makes rollback to old API code unsafe without a compatible database plan.
- The frontend workflow waits for the new API/storage capability before upload. Render must actually deploy this backend revision and run `prisma migrate deploy`; a Git push or successful static build is not proof of production activation.
- Local browser checks use mocked API responses; PostgreSQL integration tests use disposable local databases. They do not authenticate real customers against production.

## Verification completed before commit

- Full backend suite: 77 suites passed; 498 tests passed, 3 skipped (one opt-in suite). This included Auth, payment, Teacher RBAC, SBA, CSL, assignments, CMS, library and timetable tests.
- Python math-engine suite: 4 tests passed, including algebra, equivalence, matrices and chemistry.
- Frontend suite: 130 tests passed. TypeScript checks and frontend/backend builds passed.
- Deployment/rollback helper tests: 8 passed.
- Historical SQL conversion: four source modules and two legacy stream rows retained; four correct distribution records created (store, whole-school and two stream destinations); published modules converted to APPROVED.
- Browser checks: nested folders, summary question counts, both audiences selected together, retained audience badges, enrolled-only subjects, accurate subject count, empty electives and 1440/768/390px layouts passed.
- Distribution companion script dry run after migration found no remaining legacy publication statuses.
- No production login or live payment was attempted from this workspace. GitHub Actions performs the existing live RBAC and frontend verification when deployment is triggered.
