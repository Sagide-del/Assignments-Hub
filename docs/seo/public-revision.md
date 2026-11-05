# Public revision publishing

The React/Vite application uses static HTML generation rather than Next.js SSR.
`npm run build` generates `/free-revision/` and substantive `/revision/grade-N/subject/`
subject pages before bundling the private app. Questions, explanations, outlines,
metadata, canonical URLs and Course/Breadcrumb schema are present without JavaScript.

## Initial publication

The existing original public collection supplies two subject pages:

- Grade 7 Mathematics: fractions and algebra, 10 questions.
- Grade 7 Integrated Science: laboratory safety, 5 questions.

The hub lists the Grade 1–12 subject directory but only available subjects are links.
Directory labels are not a claim of verified official curriculum coverage. Empty
subject pages are neither generated nor added to the sitemap. Existing `/revision/`
and three topic URLs remain available. No private questions are exported by default.

## Approving more samples

1. Platform Admin → Content Library → open an **approved global** batch.
2. Expand **Public revision samples**.
3. Select 3–5 text-only, four-option questions. Review the correct answers and explanations.
4. Add a substantive topic introduction and 2–6 study reminders. Confirm accuracy
   and that you own or have permission to publish the samples publicly.
5. Click **Approve public samples**.
6. Run **Deploy frontend to AWS** on `main`. The build reads the public export and
   regenerates the hub, subject pages and sitemap. Approval does not itself deploy.

School-owned content is ineligible. Publishing to Public Store is separate and
never implicitly approves a full paid batch for search engines. Diagram-dependent
questions are currently excluded from public sample selection; use text-only
questions until a separate public illustration has been reviewed. Inline LaTeX
in text is rendered using local KaTeX assets with trust disabled.

`GET /api/v1/cms/public-revision` exports only a fixed whitelist of explicitly
approved frozen samples and public taxonomy fields. Reviewer IDs, module IDs,
private sources, full batches, answer-validation settings and tenant details are
excluded. Editing a topic, grade, subject or source questions invalidates its
snapshot; archived and school-owned modules are excluded. Withdrawing approval
removes samples from the feed; deploy again to delete old public documents and
invalidate CloudFront caches. Previously public content cannot be made secret
retroactively (search-engine caches and shared copies may persist).

## Deployment and rollback

The live S3 REST origin does not resolve directory index documents. The publisher
writes exact HTML objects for both clean URL forms (`/free-revision` and
`/free-revision/`, and each topic/subject URL), with one canonical trailing-slash
URL. It checks every public route against the built HTML after invalidation.
A separate alias snapshot accompanies the normal frontend snapshot and restores
previous route objects if deployment verification fails. Withdrawn route aliases
and their index documents are replaced with unlinked `noindex` withdrawal pages,
clearing old content using the existing GetObject/PutObject deployment permissions.

`PUBLIC_REVISION_FEED_URL` is a build-only URL, never a credential. CI waits for the
new public export and fails closed on invalid/unavailable data. Local builds use
the existing public collection and supplied taxonomy seed without network access.

## Search Console

Submit `https://assignmenthub.co.ke/sitemap.xml`, inspect the hub and subject
URLs, test live HTML and request indexing. Sitemap submission helps discovery;
it does not guarantee indexing or rankings. No Search Console submission is
automated by this implementation.
