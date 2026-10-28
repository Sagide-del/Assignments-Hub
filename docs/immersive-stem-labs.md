# Immersive STEM laboratories

## Coverage and interaction

All 58 activities in the original seeded catalogue now open a 3D workspace: 57 authored activity profiles in `backend/src/labs/practical-catalogue.json`, plus the dedicated titration practical. The newer Grade 10/11/12 titration records use that same titration workspace. Unknown teacher-authored activities open a clearly described general modelling bench, with the teacher's description, instructions and supporting media retained in the practical brief; this does not reproduce arbitrary custom physics.

The shared Three.js workshop supports direct pointer dragging, object picking, work-mat placement, translation, rotation, orbit and zoom, with equivalent keyboard controls. Objects use procedural geometry rather than external model downloads. Equipment geometry is shared across families of related teaching activities; this is a collection of schematic teaching models, not 58 commercial physics-engine simulators.

- Titration: move the burette, flask and pipette; clamp the burette, position the pipette at the flask and place the flask beneath the tip. Moving or holding equipment closes the tap. Existing preparation, continuous flow, single drops, swirling, manual readings, concordance, calculation and account report remain available.
- Computing: power the virtual workstation, connect the local network, trigger one of three contained threat scenarios, enable the matching defence and retest. The 3D screen, packet animation and event console reflect the procedure state. There are no external connections, executable payloads or real attacks.
- Design: position and rotate a slab, supporting walls and roof beam on a work grid. The ideal load model requires aligned components. This is an introductory two-support model, not general CAD, structural certification or an engineering safety analysis.
- Other profiles cover circuitry, optics, a pendulum, chemistry, molecules/DNA, biological systems, plant/environment investigations, agriculture and technical topics. Each profile provides its own apparatus names, procedure, instrument scale, model relationship and limitations.

If WebGL fails, the UI explicitly identifies the unavailable 3D renderer and retains accessible equipment and procedure controls. Browser draft keys include student ID and lab ID. Earlier `stem-notebook-v1` data is not deleted and can be exported from the brief.

## Curriculum and grade handling

The authenticated backend's exact grade and published-status checks remain authoritative. The frontend does not invent accessible labs or substitute another grade's catalogue. Staff-assigned `Lab.grade`, subject, description, instructions, safety notes and junior/senior variants are preserved.

Grade 7 prompts emphasise observation and fair comparisons; Grade 8 controlled variables; Grade 9 interpretation; Grade 10 quantitative methods; Grade 11 relationships and model evaluation; and Grade 12 uncertainty and validation. These are Assignment Hub adaptations of the supplied KICD BECF's inquiry, competencies and evidence/reflection approach, not quoted official subject-design outcomes.

The provided CBC HTML is a directory of curriculum links, and the supplied BECF is a framework. They do not establish the exact subject-by-sub-strand sequencing for all 58 activities. The historic senior catalogue assigned every activity to Grade 10, including advanced topics; this release does not silently redistribute those records to invented grades or claim KICD approval. Exact subject-design sequencing still needs verification against the relevant grade/subject PDFs and correction through the existing lab CMS.

## Models and evidence

Each brief states the formula or approximation used. Some are established ideal relationships (Ohm's law, small-angle pendulum, projectile range, moments, half-life, PCR ideal doubling); others are explicitly labelled illustrative indices (plant growth, nutrient availability, enzyme activity). There is no full fluid dynamics, molecular-energy solver, clinical simulation, real network stack or physical laboratory certification.

Titration retains its ideal strong-acid/strong-base model at 25 °C, a 25.00 mL aliquot and 0.100 mol/dm³ NaOH. It does not simulate real measurement noise or verify a physical endpoint's 30-second persistence.

The workshop event log records placements, variable changes, procedure actions, resets and observations. The backend independently replays it, derives readings and validates completion; it does not accept client-supplied trial results. Procedures require the appropriate equipment on the work mat. Moving used apparatus invalidates the current procedure; a changed variable requires a new procedure. Completion requires three trials across at least two settings, one fully completed procedure, a substantive conclusion and the teacher's quiz responses where present.

Reports are stored in existing `LabSession.completionSummary` alongside existing quiz grading. The account and school come from authentication. The UI distinguishes browser drafts from account saves and only confirms an acknowledged unchanged report; failures preserve drafts for retry/export. Evidence remains student-reported virtual work, not a proctored physical assessment.

## Deployment and validation

No new schema migration is needed for workshop reports. The existing titration migration supplies the three grade-specific titration records. `/api/v1/labs/capabilities` reports immersive version 2 and workshop report version `stem-workshop-v2`. GitHub frontend publication waits for the new backend before S3 upload and CloudFront invalidation.

Validation covers all original catalogue keys, every model across its scale, deterministic replay, procedure/placement rules, building alignment, attack-before-defence vs blocked-retest states, quantitative relationships, report DTO bounds, authenticated storage, grade/published access and required teacher questions.

Local Chromium checks use synthetic accounts and intercepted API responses, with the real shared backend replay logic for submitted reports. All 57 authored workshop profiles were rendered and their procedures operated in Chromium; the dedicated titration interaction was checked separately. Checks cover genuine 3D dragging, procedure operation, pointer/keyboard placement, account-save failure/retry, refresh recovery, mobile widths, context-loss fallback, titration interlocks and access-denied rendering. Catalogue previews are native screenshots of actual rendered scenes. These checks do not claim authenticated production verification.
