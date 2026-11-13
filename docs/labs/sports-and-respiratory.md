# Sports Science and respiratory learning workspaces

Five Sports Science investigations use Explore → Predict → Experiment → Compare → Explain. They are available only through persisted Senior School Sports Science scope. Each requires a prediction, two distinct bounded conditions with observation notes, a conclusion and three server-marked answers. Skeletal exploration additionally requires the femur and two other bone groups. Grade 10 focuses on foundational concepts; Grades 11–12 introduce calculations and model evaluation. Objectives are curriculum-linked; the supplied KHE 206 module labels have not been independently established as official KICD Grade 10–12 outcome references, so the UI does not claim certification.

## Models

- Skeleton: 110 atlas-derived bone meshes, selection, classification, function and an idealized 0.30 m forearm-load lever. The lever schematic is separate from the atlas pose.
- Muscle: original enlarged 3D sarcomere schematic with unchanged filament lengths and sliding overlap. Relative calcium activation and ATP availability drive illustrative cycling and active-force units. Very low ATP limits detachment; ordinary fatigue is multifactorial.
- Energy: continuous overlapping phosphagen, glycolytic and aerobic contributions; normalized teaching estimates, not physiological measurements. Lactate is not labeled the sole fatigue cause.
- Respiratory/circulatory: existing atlas lungs plus pulmonary/systemic flow schematic. Cardiac output uses rate × stroke volume. Delivery assumes arterial O₂ content 200 mL/L; uptake uses the chosen arterial–venous difference. Lung animation remains quiet breathing, independent of circulation input. No fabricated gas-removal percentages.
- Reflex: actual skeleton with an illustrative spinal pathway, virtual hotplate stimulus and slowed impulse animation. Ascending information also reaches the brain. Calculated conduction time = total path / speed + stated 2 ms synaptic delay; this is not a measurement of the learner.

Sports_Lab_Progress references the existing integer users primary key. Unique student/simulation records, database bounds, owner-derived queries, server-derived scores, atomic best-score retention and first-completion preservation. No client-supplied student ID or score is accepted. School, authentication, payments, teacher RBAC, SBA and CSL behavior is unchanged. Only an additive migration is needed; no seed is run.

## Respiratory improvements

Existing notebooks and respiratory-studio-v1 events remain compatible. Predictions persist locally and are included in recorded observation notes submitted through the existing notebook flow. A compact graph can appear alongside the 3D model on larger screens; mobile stacks it. Viewer height is reduced on phones. An optional atlas thorax overlay loads only when requested and shows illustrative chest expansion. Pressure–volume–airflow explanations distinguish ventilation, gas exchange and cellular respiration. Gas traces continue to use fixed mouth-gas fractions rather than pretending to measure blood oxygen uptake.

## Assets and verification

Source: Z-Anatomy / BodyParts3D, pinned commit 6ffffec1d9b17ed3db355903bbd762582cb2328e. Adapted skeletal and thorax meshes, notices, checksums and reproducible exporter are included under CC BY-SA 4.0. Existing Three.js and Recharts are reused; no paid API calls or duplicate rendering framework is introduced.

Checks include model/assessment tests, isolated PostgreSQL migration and ownership/best-score tests, atlas structure and hash integrity, all existing frontend/backend tests, real Chromium rendering of all five activities, mobile width checks, complete investigation submission, wrong-pathway protection, rib overlay and synchronized graph controls, prediction/notebook restoration. The browser test also exercises the animation-frame boundary fix that prevents negative curve sampling. Deployment blocks until the Sports API and migrated progress table report ready.
