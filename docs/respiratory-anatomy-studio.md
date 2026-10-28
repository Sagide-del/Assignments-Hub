# Anatomical respiratory studio

The respiratory activity (`respiration`, including `ss-bio-10-5` and staff-assigned equivalents) now opens a dedicated anatomy viewer. It no longer uses the generic Lung model / central work mat procedure. Authenticated grade and publication checks remain unchanged.

## Real atlas geometry

The local glTF asset is an extracted subset of the open Z-Anatomy atlas, derived from BodyParts3D: five separately named lung lobes, the trachea, 28 main/lobar/segmental bronchial meshes, and the diaphragm (35 meshes total). This preserves atlas anatomy such as the asymmetric lung outlines, left cardiac notch and lobe divisions. It is not a scan of a student or patient.

Source repository: https://github.com/Z-Anatomy/Models-of-human-anatomy
Source commit: `6ffffec1d9b17ed3db355903bbd762582cb2328e`.

The source Blender archive was read with automatic script execution disabled. Only the selected respiratory objects were exported; source labels, excess modifiers and unrelated anatomy were excluded. Airways were converted from curves, lobe surfaces smoothed once, and the result exported as a roughly 2.9 MiB GLB with embedded copyright and provenance. The supplied export script accepts an input `.blend` and output directory:

```bash
blender --background --disable-autoexec \
  --python frontend/scripts/assets/export-respiratory-atlas.py -- \
  --input /path/to/Z-Anatomy/Startup.blend \
  --output frontend/public/stem/anatomy
```

Attribution, upstream notices and a checksum/structure manifest are published alongside the asset. The adapted model data and atlas previews are distributed under CC BY-SA 4.0, with credit to Z-Anatomy (Gauthier Kervyn and Marcin Zielinski) and BodyParts3D (DBCLS / Kousaku Okubo; upstream CC BY-SA 2.1 Japan credit retained). The separately credited noncommercial kidney/ear assets are not part of this respiratory subset. The app's original code remains separate from this licensed model data.

## Learning interaction

Students can rotate/zoom the model, reset front/back/oblique camera views, select structures directly or through the keyboard-accessible guide, reveal the airway tree through translucent lung surfaces and view the five lobes separately. The enlarged alveolar/capillary close-up is an original schematic, labelled as separate from the atlas and not to scale.

Breathing expands the lung surfaces and lowers/flattens the diaphragm representation. The original organ mesh is anatomical; its deformation and surface appearance are educational approximations, not a biomechanical/clinical simulation. The guide explains inspiration, quiet expiration, conducting airways and partial-pressure-driven gas exchange without suggesting that lungs actively contract as skeletal muscle.

Controls compare rate and tidal volume. The three supplied patterns each have a minute ventilation of 6 L/min, but different estimated alveolar ventilation:

| Pattern | Rate /min | Tidal volume / L | Minute ventilation / L·min⁻¹ | Alveolar ventilation / L·min⁻¹ |
|---|---:|---:|---:|---:|
| Quiet | 12 | 0.50 | 6.0 | 4.2 |
| Rapid, shallow | 24 | 0.25 | 6.0 | 2.4 |
| Slower, deeper | 8 | 0.75 | 6.0 | 4.8 |

The formulas assume fixed adult anatomical dead space of 0.15 L. The animated resting-volume reference is 2.5 L. Neither is a personalised health measurement, and ventilation is not a calculation of oxygen uptake. The inspiratory/expiratory animation uses a smooth 40:60 cycle; playback speed changes simulated time only.

## Evidence and deployment

The respiratory studio reuses scoped browser drafts, export, account-report recovery and teacher resources. Reports use `respiratory-studio-v1` in the existing studio DTO and `LabSession.completionSummary`. Backend replay derives ventilation values from the configured conditions. It requires the main anatomical structures to be inspected, three observations across at least two conditions, at least two full breaths per observation, descriptive notes and a conclusion. Repeated recording of the same observation window is rejected. Existing teacher-question checks and authenticated ownership remain in force.

The 3D asset loads only in this activity, with progress and an explicit retry on model/network/WebGL failure; it is not replaced with a fake anatomical placeholder. The display caps pixel ratio for ordinary devices. The gate for frontend deployment now checks immersive API version 4 and the respiratory studio capability. No database schema migration is required.

Validation covers model integrity, embedded attribution, required anatomical meshes, ventilation/dead-space arithmetic, continuity of breathing volume/flow, evidence validation and grade/ownership checks. Chromium checks use synthetic Grade 11 fixtures and local production builds, not authenticated production access. They exercise actual model loading, views, anatomy inspection, timed observations, failed-save retry, account recovery, mobile layouts and WebGL fallback.

## Live breathing graphs

The **Live graphs** view places the graph beside the same breathing controls used by the anatomical viewer. It follows the shared simulated clock, speed and pause state. Switching between the viewer and graphs preserves the current observation's time after the first model load. A condition change resets the trace; recorded observations remain intact.

The graph offers three views, 10/20/30-second rolling windows, pointer/touch and keyboard sample inspection, inspiration shading and an accessible numeric sample table. Its SVG plotting dimensions adjust to the available width so labels remain readable on narrow screens.

- **Breath volume:** air added above the model's resting volume, in mL. The wave height is the tidal volume, not total lung capacity.
- **Airflow:** the derivative of the same smooth breathing waveform, in L/s, with positive inspiration and negative expiration.
- **O₂ & CO₂:** illustrative gas carried at the mouth, in mL/s. It distinguishes inspired oxygen, expired oxygen and expired carbon dioxide.

The gas illustration assumes fixed dry example fractions: inspired oxygen 20.95%, expired oxygen 16%, expired carbon dioxide 4%, and equal total inspired/expired volumes. Multiplying positive/negative bulk airflow by these fractions produces the traces. Per-minute totals use minute ventilation and the same fractions. These are carried-gas illustrations, not measurements or predictions of blood oxygen uptake, metabolic CO₂ production or blood-gas concentrations. Gas fractions do not respond to changing metabolism or ventilation/perfusion. The assumptions are visible beside the chart and expanded in its help panel.

Consequently, the three equal-minute-volume presets have equal example carried-gas totals even though their waveform timing differs and the existing dead-space model yields different alveolar ventilation. This keeps the two teaching concepts distinct. No additional clinical inference is made from the ventilation controls.

No API, database or assessment-evidence format change is needed. New tests independently integrate the traces over a breath, verify the stated fractions/units, check rate/depth scaling, bound the rolling window and confirm that no future or prior-condition samples are fabricated.
