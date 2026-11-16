# Blog content expansion — 16 November 2026

## Delivered

Five existing guides now contain the requested practical material:

- CBC grading: eight platform practice bands, a clearly fictional report example, a next-step checklist and parent FAQs.
- CSL: ten project cards, each with materials, indicative KES cost, supervision, evidence and a fictional reflection; five process steps and FAQs.
- Mathematics: comparison table, worked surds and simple-interest examples, choosing checklist and FAQs.
- Pathways: four areas explicitly attributed to the 2019 framework, owner-supplied ST2056 example, selection checklist and current-source checks.
- KJSEA: five original supplementary Grade 9 Mathematics questions with expandable worked answers, weekly checklist and FAQs. They are not official papers.

Four new public, statically rendered articles:

- `/blog/career-path-selection-guide/`
- `/blog/individualized-study-timetables/`
- `/blog/short-topic-based-tests/`
- `/blog/role-of-virtual-labs/`

All eleven articles retain the existing visual design and use 800–1,200 editorial words, generated H2/H3 contents, three takeaways, answer-first introductions, cited research, expandable FAQs with matching FAQPage JSON-LD, career connections, relevant CTAs and four related guides. The two other pre-existing articles remain available.

Every article links to public revision, Learning Coach and Career Compass, and has at least two official curriculum/assessment resources. The missing `/student/coach` path now aliases the existing protected Learning Coach component. Student-only post-login return destinations include the new timetable and assignment CTAs; authentication boundaries are unchanged.

The four new covers are custom SVG infographics with matching JPEG sharing exports and provenance hashes. CBC artwork now shows all eight practice bands. Three optimized WebP product screenshots show demo SBA data, the timetable and the respiratory workspace; fixture screenshots are labelled as demonstration data. No generic AI cover is used.

A shared five-link Popular Guides catalogue is rendered in the homepage footer and all existing static public footers. Generation is idempotent. Authenticated workspace footers remain untouched. Sitemap and article sharing metadata include the new URLs. Existing bounded first-touch attribution accepts the four new editorial identifiers; no identity, answers or extra event types were added. A version-4 readiness gate prevents frontend publication against a backend that lacks those identifiers.

## Accuracy decisions

- The eight percentage bands describe Assignment Hub's `practiceEstimate` rubric, not a universal official report-card conversion. No real pupil's report was supplied.
- Current subject offerings must be checked against MoE and the school; the 2019 framework is date-qualified.
- The platform's 135-hour CSL target is not presented as proof of a universal national rule.
- Unsupported universal 50%, 80% and 30% learning gains, PISA's alleged “strongest predictor”, and unverified Grinberg/Duan findings were not published. Identifiable studies are described with their actual scope and limitations.
- Three attempts is a platform workflow, not a guarantee of mastery. Short tests complement full mocks. Simulations complement physical practicals.
- Official resource links do not imply endorsement. FAQPage markup does not guarantee a Google rich result, ranking or subscription growth.

## Verification

- Frontend production build passed, including TypeScript, static pages and edge routing generation.
- 27 revision/SEO/content tests passed.
- Five static routing/SEO tests passed.
- Four backend attribution tests passed.
- Browser checks passed for every article at 320, 390 and 1280 pixels, with JavaScript disabled: layouts, loaded images, contents anchors, FAQs, related links and CTAs.
- Interactive browser checks passed for the existing checklist, first-touch attribution and free revision.
- Homepage browser checks passed, including non-JavaScript HTML, split lung hero, mobile layout, navigation and the five new footer links.

The browser suite caught a missing contextual CSL link, which was restored. An older homepage assertion requiring an empty footer was updated to assert the newly requested five-link footer.
