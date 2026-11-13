# Sports Science and respiratory learning workspaces

Five Sports Science investigations use Explore → Predict → Experiment → Compare → Explain. They are available only through persisted Senior School Sports Science scope. Each requires a prediction, two distinct bounded conditions with observation notes, a conclusion and three server-marked answers. Skeletal exploration additionally requires the femur and two other bone groups. Grade 10 focuses on foundational concepts; Grades 11–12 introduce calculations and model evaluation. Objectives are curriculum-linked; the supplied KHE 206 module labels have not been independently established as official KICD Grade 10–12 outcome references, so the UI does not claim certification.

## Models

- Skeleton: 110 atlas-derived bone meshes, selection, classification, function and an idealized 0.30 m forearm-load lever. The lever schematic is separate from the atlas pose.
- Muscle: original enlarged 3D sarcomere schematic with unchanged filament lengths and sliding overlap. Relative calcium activation and ATP availability drive illustrative cycling and active-force units. Very low ATP limits detachment; ordinary fatigue is multifactorial.
- Energy: continuous overlapping phosphagen, glycolytic and aerobic contributions; normalized teaching estimates, not physiological measurements. Lactate is not labeled the sole fatigue cause.
- Respiratory/circulatory: existing atlas lungs plus pulmonary/systemic flow schematic. Cardiac output uses rate × stroke volume. Delivery assumes arterial O₂ content 200 mL/L; uptake uses the chosen arterial–venous difference. Lung animation remains quiet breathing, independent of circulation input. No fabricated gas-removal percentages.
- Reflex: actual skeleton with an illustrative spinal pathway, virtual hotplate stimulus and slowed impulse animation. Ascending information also reaches the brain. Calculated conduction time = total path / speed + stated 2 ms synaptic delay; this is not a measurement of the learner.

Sports_Lab_Progress references the existing integer users primary key. Unique student/simulation records, database bounds, owner-derived queries, server-derived scores, atomic best-score retention and first-completion preservation. No client-supplied student ID or score is accepted. School, authentication, payments, teacher RBAC, SBA and CSL behavior is unchanged. Only an additive schema migration is needed; no curriculum taxonomy seed is run.

## Respiratory improvements

Existing notebooks and respiratory-studio-v1 events remain compatible. Predictions persist locally and are included in recorded observation notes submitted through the existing notebook flow. A compact graph can appear alongside the 3D model on larger screens; mobile stacks it. Viewer height is reduced on phones. An optional atlas thorax overlay loads only when requested and shows illustrative chest expansion. Pressure–volume–airflow explanations distinguish ventilation, gas exchange and cellular respiration. Gas traces continue to use fixed mouth-gas fractions rather than pretending to measure blood oxygen uptake.

## Assets and verification

Source: Z-Anatomy / BodyParts3D, pinned commit 6ffffec1d9b17ed3db355903bbd762582cb2328e. Adapted skeletal and thorax meshes, notices, checksums and reproducible exporter are included under CC BY-SA 4.0. Existing Three.js and Recharts are reused; no paid API calls or duplicate rendering framework is introduced.

Checks include model/assessment tests, isolated PostgreSQL migration and ownership/best-score tests, atlas structure and hash integrity, all existing frontend/backend tests, real Chromium rendering of all five activities, mobile width checks, complete investigation submission, wrong-pathway protection, rib overlay and synchronized graph controls, prediction/notebook restoration. The browser test also exercises the animation-frame boundary fix that prevents negative curve sampling. Deployment blocks until the Sports API and migrated progress table report ready.

## Requested Sports demonstration learner

The explicit demo request is provisioned only during the configured production backend’s pre-deploy, within an initial 48-hour setup window. It creates one isolated SPORTSDEMO school, Grade 10 stream 10S and SPORTS1001 learner with a 14-day account expiry and a persisted Sports Science selection. The PIN is delivered privately to the owner; only its bcrypt hash is in the deployment seed. No existing account is reset, no subscription payment is fabricated and no email or STK request is sent. Subsequent deployments do not renew or overwrite the account. The setup window prevents deleted demos from being recreated indefinitely.

The public capability response exposes only a demo-ready boolean after checking the expected active role, grade, expiry, credential hash and Sports Science scope. A separate one-off CI check verifies this readiness. Manual setup remains available through the explicit provision-sports-demo.cjs --apply command; it prints a newly generated PIN only in the invoking shell and checks login and access. Tests verify actual hashed-PIN login and persisted scope in PostgreSQL.

### Muscle explorer revision

The muscle activity now opens with actual atlas-derived right upper-limb
geometry (biceps long/short heads, triceps heads, brachialis, scapula, humerus,
radius and ulna). The bounded 645 KB asset is an adaptation of the existing
pinned Z-Anatomy/BodyParts3D source under CC BY-SA 4.0, with exporter, provenance
and attribution shipped alongside it. Materials are illustrative. This is
resting anatomy, not a musculoskeletal force or elbow-joint simulation.

Fibre and sarcomere tabs are separate procedural educational reconstructions.
They provide selectable structure descriptions, a four-stage cross-bridge guide,
pause/reset controls, and retain the existing calcium/ATP investigation model.
Thin and thick filament lengths stay constant while overlap changes. Severe ATP
depletion stops the illustrative cycle; it must not be presented as ordinary
exercise fatigue. No clinical quantities or photorealism are claimed.

Browser regression checks inspect all three scales, structure selection, manual
ATP-detachment explanation, mobile overflow, and the existing investigations and
respiratory persistence checks. Asset checks verify checksum, provenance, known
muscle structures and size budget.
