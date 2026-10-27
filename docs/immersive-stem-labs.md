# Immersive STEM laboratories

The catalogue distinguishes 3D practicals, 3D models, existing 2D interactive models and activity notebooks. It only displays labs returned by the authenticated, grade-scoped API.

## Available experiences

- Acid–base titration: original Three.js apparatus, orbit/zoom and camera presets, keyboard-accessible equipment selection, preparation sequence, continuous tap flow and 0.05 mL drops, swirl action, indicator change, manually entered meniscus readings, repeated trials, concordance checks, concentration calculation, conclusion and downloadable notebook.
- Pendulum: animated Three.js apparatus in the existing investigation notebook. Length affects the ideal period; mass changes the bob size and does not change the calculated period.
- Other existing experiments retain their original interactive models or teacher-authored activities. They are not labelled as 3D practicals.

Titration uses an ideal strong acid/strong base equilibrium model at 25 °C, 25.00 mL acid and 0.100 mol/dm³ sodium hydroxide. The acid concentration is fixed in this teaching model. The representation does not simulate full fluid dynamics, real measurement noise, chemical hazards or the persistence of an endpoint over 30 seconds. Physical practicals require teacher supervision. Stored evidence is student-reported simulation work, not certification of laboratory competence.

## Evidence and persistence

Browser drafts are scoped by student ID and lab ID. Each run can only be recorded once. A fresh run keeps previous readings. Rough, unmixed, overshot or inconsistent readings do not qualify as concordant endpoint runs. Completion requires at least three trials, two accurate endpoint titres within 0.10 mL, a calculation consistent with those titres, and a conclusion.

The existing lab-session endpoint validates this evidence independently and saves the report in `LabSession.completionSummary`, scoped to the authenticated student. The UI only confirms account saving after a successful server response for the submitted report. An unsuccessful request preserves the browser draft and permits retry. Existing teacher-authored quiz questions remain required and retain server grading. A prior account report can be loaded without silently replacing current browser readings.

If WebGL creation fails or its context is lost, an explicitly labelled 2D view retains the controls and readings. The 3D dependency loads only when entering an appropriate experiment.

## Deployment

The additive migration `20261028090000_immersive_titration_labs` creates published titration catalogue records for Grades 10, 11 and 12. Existing records are preserved. No schema columns are added.

The public `/api/v1/labs/capabilities` endpoint exposes only feature readiness and checks that all three catalogue records exist. GitHub frontend deployment waits for this readiness before uploading to S3 and invalidating CloudFront. The backend must deploy and run its normal Prisma migrations first.

## Validation

- Frontend unit suite: 47 tests, including chemistry monotonicity, frontend/backend model agreement, endpoint evidence, calculation readiness and draft restoration.
- Backend assessment/session suites: 42 tests, including report validation, grade/published access checks, DTO validation and authenticated report storage.
- TypeScript frontend production build, backend compilation and Prisma schema validation.
- Local Chromium with software WebGL and fixture APIs: real rendered apparatus, preparation controls, tap flow, drop/swirl, repeated readings, concordance, concentration, server-side evidence assessment, failed-save recovery, refresh restoration, 320/390 px layouts, explicit WebGL-context-loss fallback with working controls, catalogue navigation and pendulum animation.

Browser checks use synthetic accounts and intercepted API responses; they do not claim authenticated production testing. The catalogue preview is a screenshot of the actual rendered scene.
