# Skill learning workspace

The ten built-in programmes now have 40 authored introductory lessons rather
than repeating course outcomes as lesson content. Python has eight progressive
lessons, first aid has six, robotics and machine learning have four each, and
the remaining six programmes have three each. These are beginner learning paths,
not evidence of a complete accredited course or a professional qualification.

## Content and illustrations

`frontend/src/features/student/skill-workspace/content/` contains the lesson
model and learning packs. Each lesson supplies an objective, teaching sections,
a practical activity and an explained understanding check. Coding lessons also
supply starter code, an expected output, a hint and a worked solution. Robot
movement lessons additionally check the simulated final position and direction.

Original SVG illustrations live in `frontend/public/skill-illustrations/`. They
include accessible descriptions and can be opened at full size. Essential
instructions also appear as text. There are no stock-image or image-CDN requests.

The pack resolver matches the existing catalogue titles, case-insensitively.
Custom course outlines remain available, but an outline alone cannot be marked
as a full lesson. The existing platform course editor does not yet author these
rich learning packs; update the versioned source files for built-in lessons.
This release does not add a CAD modeller, video editor, real Arduino connection
or a first-aid certification. Those programmes explicitly distinguish guided
planning activities from tools or qualifications they do not provide.

First-aid content is introductory and requires a qualified first-aid instructor's
review before use as formal training. It uses simulated decisions and drawings,
not procedures practised on classmates, and includes escalation guidance and
links to NHS and British Red Cross reading. Automated checks verify structure
and rendering, not clinical correctness. Attempts to fetch the medical source
pages from this environment returned HTTP 403, so current source-page contents
were not independently verified during implementation. The content does not
claim professional or clinical approval.

## Progress compatibility

Existing generic `lesson-1` records are retained on the server. Expanded lessons
use explicit versioned keys such as `python-v1-hello` and `firstaid-v1-fainting`.
They do not reuse old generic completion keys. This prevents an old outcome-only
completion from being counted as completion of a new substantive lesson.

Course cards, details, workspace navigation and progress summaries share the
same lesson resolver. Unknown and duplicate lesson records do not inflate totals.
No database migration or production reseeding is required.

The completion endpoint remains learner-scoped and authenticated. A successful
practice check plus a correct understanding answer enables completion; guided
lessons require their activity checklist and understanding check. These are
learning checks, not secure exams or proof of competence. Learners can inspect
worked solutions and explore later lessons without fabricating progress.

## Code runner and drafts

Python runs in a browser Web Worker using pinned Pyodide 0.27.7 from
`https://cdn.jsdelivr.net/pyodide/v0.27.7/full/`. It is downloaded only when the
learner runs code. Machine-learning examples additionally load NumPy. Initial
runtime loading needs internet; do not promise offline execution or low data use
for the interpreter download.

Each run uses a fresh Python namespace. The interpreter and package cache stay
alive for repeat runs within a lesson. Standard input is supplied one line per
`input()` call. Output is bounded, execution has a 10-second limit after interpreter
startup, and Stop terminates the worker. Runtime loading has a separate 90-second
limit. Navigation terminates that lesson's worker. A fetch guard blocks learner
fetch calls while allowing interpreter package downloads; this is not a claim
that a same-origin worker is a comprehensive sandbox for hostile code.

Code, input and reflection drafts are localStorage entries scoped to learner ID,
course ID and versioned lesson key. They survive refreshes on the same browser,
but do not sync to another device or become teacher submissions. Storage failures
are displayed. Code can be downloaded as `.py`; reset/example replacement has an
undo action. Drafts must not contain passwords or sensitive medical information.
Only completion records are sent through the progress API.

## Validation

From `frontend/`:

```sh
npm run test:skills
npm run build
```

Tests cover ten packs, lesson-key uniqueness, content structure, illustration
paths, versioned progress compatibility, Python worked solutions in CPython,
robot movement and output checks, draft scoping, and beginner error guidance.
Browser validation uses the real Pyodide/NumPy runtimes with mocked course and
progress APIs. It covers repeat execution, stdin, fresh variables, Stop/recovery,
incorrect output, failed saves, completion gating, illustration rendering,
private draft restoration and mobile layouts. Backend authentication, live
content availability and real production progress persistence are not established
by those mocked API checks.


## Illustrated first-aid revision (v2)

First Aid Foundations now includes six locally hosted, generated scenario
illustrations, paired with the original simplified diagrams. The WebP images
are approximately 88–205 KB each. They depict fictional learning scenarios, not
real patients or diagnoses. Images were visually inspected; the burn illustration
was corrected so running water visibly reaches the affected forearm. This is
visual QA, not professional medical review.

Each of the six lessons contains recognition cues, an ordered response guide
with reasons, actions to avoid, urgent warning signs, a recap and two explained
scenario exercises. The original activity checklist and understanding check
remain. Both scenario decisions must be correct before completion can be saved;
changing a passed answer revokes readiness. Versioned `firstaid-v2-*` keys prevent
v1 completion records from being counted as completion of these expanded lessons.
Existing v1 records and browser drafts are not deleted.

The course overview shows an illustrated introduction and lesson previews.
Individual lessons can be opened directly with `?lesson=<versioned-key>` on the
workspace URL. An invalid lesson key falls back to the normal resume selection.
The gallery supports illustration/diagram switching, a native enlarged-image
dialog with keyboard focus restoration, and visible error/retry handling when a
missing image returns homepage HTML.

The curriculum and visuals still require qualified first-aid instructor review
before formal training use. No professional review or accreditation is claimed.
The current NHS and British Red Cross source pages could not be fetched from this
environment (network HTTP 403 / tunnel denial), including a normal browser attempt.
References are topic-specific reading links, not evidence of completed live-source
or clinical verification.

Publish the **entire** frontend `dist/` directory, including
`skill-illustrations/`, rather than just the JavaScript `assets/` directory. The
live site was still serving its October 20 bundle during implementation, and a
new illustration URL returned the SPA homepage with HTTP 200 and text/html. A Git
push alone did not establish publication.

Verify an actual deployment with:

```sh
npm run check:firstaid-assets -- https://assignmenthub.co.ke
```

This checks all six image URLs for an image content type and a WebP signature,
so an HTTP 200 homepage fallback cannot pass. Then sign in, open First Aid
Foundations and test the actual lessons and completion persistence.
