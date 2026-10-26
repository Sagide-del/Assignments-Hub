# Public revision resources

The first release targets Grade 7 junior school learners in Kenya with original
fractions, introductory algebra and laboratory safety practice. Each topic has
five questions, worked answers, a local automatic score and a retry action.

## Maintain and validate

Edit `frontend/content/revision.mjs`, not the generated HTML. Have a subject
teacher review topic placement, accuracy and coverage against the current KICD
design before describing resources as curriculum aligned. The site deliberately
makes no KICD approval, examination prediction or full-syllabus claim.

From `frontend/` run:

```sh
npm run test:revision
npm run build
```

The prebuild step regenerates the HTML and sitemap entries. Commit the generated
`public/revision/**` HTML so the development server serves it immediately too.
Generation preserves non-revision sitemap entries and is repeatable. New topics
also need explicit directory routes before the SPA fallback in `render.yaml`.
Use ordinary anchors, rather than React Router links, to reach these standalone
pages. The Vite configuration now declares Node type definitions for type checking.

The pages include canonical URLs, descriptions, social sharing metadata,
LearningResource and breadcrumb structured data. All questions and answers
exist in the HTML even without JavaScript. The quiz loads only a small stylesheet
and a browser module; it does not load the authenticated app or request the API.
There are no remote fonts, ads, videos or tracking pixels.

## Deployment and discovery

These changes must be deployed to the public frontend before Google or learners
can see them. Build with the repository's normal `npm run build`; publish `dist`.
Render directory routes are declared ahead of the SPA fallback. If using another
host, serve `/revision/` and the topic directories from their `index.html` files,
and serve their assets directly rather than rewriting them to the SPA.

After deploying:

1. Check `/revision/` and every topic URL, including a direct visit and refresh.
2. Verify view-source contains the questions, explanations and matching canonical.
3. Try an incomplete attempt, a perfect score, an incorrect answer and a retry.
4. Confirm the homepage links and learner registration still work.
5. In Search Console, inspect the hub and topic URLs, request indexing, and check
   the existing `https://assignmenthub.co.ke/sitemap.xml` submission.

Google decides whether and when to index and rank new pages. Publishing alone
does not establish indexing or guarantee traffic.

## Reach teachers and parents

Each topic has a WhatsApp share link containing its canonical URL and a school
demo link using the site's existing contact. No messages are sent automatically.
Ask group administrators for permission, invite a few teachers to trial the
resources, and use their feedback before adding more grade levels. Do not invent
school endorsements or testimonials.

## Measurement and privacy

Search Console already measures impressions, clicks, search position and landing
pages. Review the `/revision/` pages weekly; allow time for new pages to be crawled.

The module emits local `assignmenthub:learning` window events for `quiz_start`,
`quiz_complete`, and `registration_click`, with only the resource slug. These
hooks do not send analytics anywhere. An approved analytics integration can
subscribe to them later; no analytics account, collector or dashboard is
configured by this release. In particular, do not describe quiz completions or
registrations as measured in production until a collector is configured and
verified. Decide consent and learner-data requirements before enabling tracking.

Answers and scores stay in memory, are not sent to the API, are not saved in
localStorage or cookies, and do not transfer to a learner account. A refresh
clears the attempt. Account creation and third-party WhatsApp links have separate
requirements and data handling. This practice-page notice is not a replacement
for a site-wide privacy policy.

## Validation performed

The frontend production build and four Node tests pass. The tests check scoring,
question data, crawlable HTML, structured data and repeatable sitemap generation.
Browser checks cover mobile layout, required responses, correct and incorrect
scores, retries, worked answers, sharing links, no-JavaScript content and the
revision-to-registration UI on both the development server and production preview. The registration API is mocked for the UI check;
backend registration and real payment processing are outside this validation.
