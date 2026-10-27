# STEM investigation workspace

The student STEM catalogue now opens an evidence notebook rather than a content-management summary. It supports Prepare → Investigate → Explain, with prediction, method, recorded evidence, conclusion, reflection and a downloadable plain-text notebook.

## Content and models

Six existing published catalogue keys have authored question-led investigations and browser models:

| Key | Activity | Model |
| --- | --- | --- |
| js7-lab1 | Plant Growth Investigation | Illustrative growth index; compare light and water |
| js7-lab2 | Water Purification Challenge | Illustrative suspended-particle counts; appearance does not establish water safety |
| js7-lab3 | Simple Circuit Builder | Ohm’s law and open/closed switch with fixed resistance |
| ss-phy-10-2 | Pendulum Lab | Small-angle period, length and mass comparisons |
| ss-agr-10-2 | Hydroponics Simulator | Explicitly illustrative pH/availability curve |
| ss-phy-10-8 | Photoelectric Effect Lab | Photon energy, work-function threshold and maximum kinetic energy |

These packs resolve by exact lab key, after an authorised API response. No client-generated catalogue entries bypass grade restrictions. The service continues to control access to published labs for the learner’s grade. A student sees only the matching activities returned by the service, not all six automatically.

Each pack contains a local context, short concept explanation, a prediction, variables/controls, three investigations, an evidence-based explanation prompt, a community/home connection, safety notes and model limitations. The activities practise inquiry and explanation; they do not claim KICD approval or replace teacher assessment. Physics models and illustrative environmental models are explicitly distinguished. No heavy runtime or external simulation download is needed.

Other labs retain their CMS steps, learning outcomes, materials, safety instructions, resources, questions, reflections and assessment criteria within the same notebook structure. An activity without steps can be explored/planned but cannot be marked complete. Additional titles are not presented as working simulations solely because their database type is SIMULATION.

## Persistence and assessment

- Drafts are namespaced by user ID and lab ID in localStorage (`stem-notebook-v1`). Browser reload preserves prediction, steps checked, up to 20 trials, observations, conclusion, transfer, answers and reflections. Models reopen at their default controls; recorded trials remain intact.
- Notebook storage is local to the browser, not synced to the account or teacher dashboard. Download includes the whole notebook, question answers and reflections, plus model limitations. The UI explains this distinction. Storage failures are surfaced with a download recommendation.
- Completion requires a nonempty prediction, observations and conclusion, every step checked, all existing questions/reflections answered, and at least three trials for a built-in model. These are participation checks, not automatic scientific validation or proof of mastery.
- The existing POST /lab-sessions endpoint records completion and question answers only. There is no invented reflection/portfolio persistence API. Errors keep drafts intact and allow retry; success invalidates the learner’s session history.
- Catalogue counts use actual API sessions, not the number of configured content sections. Multiple sessions for one lab count as one completed lab. Query keys include learner identity.

## Validation

Run `npm run test:stem` and `npm run build` in frontend. Automated browser checks exercised catalogue filtering, all six benches, current values, evidence gates, reload persistence, text export, failed completion retry, teacher-authored steps/questions/reflections, empty-lab blocking and 320/390px layouts. API fixtures were used: authenticated production persistence has not been tested with a real student account.

## Release

Deploy the complete frontend dist contents to the existing S3 website root and invalidate `/*` on CloudFront distribution EC57E3OHWZ6MP. A Git push alone has previously rebuilt the API without publishing the frontend. Compare the public index bundle with the tested build after invalidation. This release includes the previous first-aid illustrations and learning workspace assets.
