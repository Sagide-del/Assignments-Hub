# Visual revision-sheet standard

All CMS cheat-sheet previews, learner theory views and library PDFs use the same editorial principles:

- Black and white, clear hierarchy, explanatory visuals, short teaching points, formulas where needed, specific corrections and an active-recall prompt.
- A4 portrait with 12 mm margins. Keep teaching text readable: fit between 13 and 12 CSS pixels (approximately 9–9.75 pt). Never truncate or hide content to pass a page-count check.
- New AI-generated sheets: at most 240 prose words, no point longer than 35 words. Historical records retain their existing validation contract and are not rewritten.
- PDFs and browser print preflight measure the content. Oversized legacy sheets remain readable on screen but require editorial condensation before one-page printing. API returns 422 with an actionable message instead of generating a clipped/two-page file.
- Scientific/math topics should use the right visual language: anatomical illustration, apparatus diagram, worked construction or relationship map. Do not add a realistic photograph simply as decoration.

## Curated illustration coverage

`backend/src/cms/cheatsheet-visuals.ts` is the shared, exact-topic registry used by browser and PDF. Initial coverage: fundamental sports skills, lungs/respiratory system, heart, plant cell and simple electric circuits. Matching is deliberately conservative; unrelated titles never acquire an image because of a shared word.

The sports plate is an original AI-generated educational illustration. Other plates reuse existing Assignment Hub recall artwork. These are teaching illustrations, not clinical references or independently certified anatomical models. Subject editors should review each illustration and its captions before expanding coverage.

## Automatic diagram pipeline

New CMS drafts and AI enrichment now request `visual_diagram` along with the notes. DeepSeek chooses explanatory geometry appropriate to the subject and topic: scientific structures, apparatus, forces, geometry, timelines, comparisons or worked examples. This is an inert drawing blueprint, not arbitrary SVG.

`CheatsheetDiagramService` checks for an existing valid drawing or suitable bundled realistic plate. If neither exists, it uses the same metered AI router to create the diagram from the actual topic, grade, concepts, formulas and mistakes. Malformed diagram-only responses are retried once. Repeated structural failure prevents an incomplete sheet being saved; provider/quota errors propagate without blind retries. Successful diagram-call tokens are added to module accounting. Drawings are stored alongside the sheet in both CMS JSON projections.

The shared validator checks exact fields, bounded shape count, coordinates, path commands, label length/size, wrapping and overlapping labels. The closed SVG renderer escapes every text label and has no image URLs, scripts, styles or external resources. Browser views and PDFs use this same renderer. Drawing correctness still needs the normal content-review process; structural validation does not prove scientific accuracy.

Known detailed artwork takes precedence. Other upgraded sheets render their generated explanatory drawing. The old concept map remains only for backward compatibility until a legacy sheet is upgraded. No AI call or external image download occurs when a learner opens or prints a sheet.

DeepSeek is a text provider: these are automatically generated scientific/vector diagrams, not a claim of automatically generated photorealistic artwork for every topic. No additional image-provider key is required.

## Existing-sheet upgrade

Run `npm run cms:backfill-cheatsheet-diagrams -- --limit=100` in the backend environment for a **dry run**: no provider calls or writes. Apply with `--apply --actor-id=<platform-admin-id>`. Requires the normal database and DeepSeek configuration. Use `--all` to process the entire catalogue in bounded sequential batches, or `--after=<next_after>` to continue a single-batch run. A failure stops further batches; rerun from the beginning after resolving it so failed rows are revisited. A second pass skips valid drawings and known realistic plates.

The backfill also handles sheets embedded only in `content_json`. It refuses to overwrite conflicting top-level/embedded notes. It preserves questions, teaching text, status and distributions, and uses a compare-and-update check to avoid overwriting concurrent edits. The summary reports failures and the next cursor; inspect failures before resuming. Existing sheets with no structured notes are skipped rather than inventing new historical content.

## Optional additional realistic artwork

1. Create or license a subject-specific teaching illustration, without embedded body text. Review anatomy, mechanics, representation and factual captions.
2. Export an optimized WebP; store the print version at `backend/src/study-hub/assets/cheatsheet-illustrations/<key>.webp`. Nest already bundles this assets directory.
3. Put the browser version under `frontend/public/cheatsheet-illustrations/` (or reuse existing public teaching artwork).
4. Add exact topic aliases, accessible alt text, a limitation caption and three short explanatory labels to the shared registry. Do not accept arbitrary model-generated image URLs or SVG.
5. Run the design tests with Chromium, inspect the actual PDF and check mobile layout. Update both assets together.

## Verification

```
cd backend
LIBRARY_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm test -- --runInBand src/__tests__/cheatsheet-design.spec.ts src/__tests__/student-library.spec.ts src/__tests__/content-delivery-phase1.spec.ts
```

The existing student-library database integration tests additionally require a disposable CMS_TEST_DATABASE_URL; do not point these at production. No schema or data migration is needed for this design rollout.
