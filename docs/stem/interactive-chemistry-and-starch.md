# Interactive chemistry and leaf starch practicals

This release replaces the generic organic chemistry / molecular bonding players with a construction studio, improves the existing titration player and adds a separate leaf-starch practical. It does not replace the remaining generic workshop models. Pendulum, computer and respiratory studios keep their existing behaviour.

## Student workflow

- **Titration:** check eye protection, rinse and fill the burette. Select the volumetric pipette, click the HCl sample bottle, then the flask to deliver 25.00 mL. Select the separate dropper, click phenolphthalein, then the flask. Use the tap, single drops and swirling; record manual meniscus readings and repeat trials as before. On-screen apparatus labels and equivalent buttons support touch and keyboard access. The pipette does not transfer indicator into the burette.
- **Molecular construction:** select a target; place carbon, hydrogen and oxygen at guided sites. Switch to Bond mode, select bond order, then two atoms. Remove an atom to remove its connected bonds. The model accepts a recorded structure only when element assignment, connectivity and normal valency match the selected molecule. Record two distinct molecules and explain their bonding for the account report. Rotation and zoom show tetrahedral methane, planar ethene, linear ethyne, bent water and an idealised ethanol conformation. It is not a molecular dynamics calculation.
- **Leaf starch test:** use forceps to transfer a prepared leaf into near-boiling water; complete the preparation, extinguish the flame, fill the ethanol tube, transfer the leaf, then use the tube holder to put the tube in the hot off-flame bath. Rinse the decolourised leaf, place it on the white tile and load/apply iodine using a separate dropper. Record a light-grown leaf and a destarched dark control. The optional variegated specimen provides an extension. Preparatory plant conditions, experimental controls and interpretation are explained in the workspace.

The starch timer explicitly accelerates model time tenfold. Temperatures, timings and colour transitions are illustrative; actual classroom apparatus needs teacher supervision. Ethanol is never heated over a lit burner, and the engine rejects opening ethanol or reigniting the burner while ethanol is in use.

## Persistence and deployment

New reports use `starch-studio-v1` and `molecular-studio-v1`. The server replays actions, derives results, enforces grade access and checks conclusions before writing account evidence. Browser drafts and exports remain available, and an account notebook can be restored into an empty browser draft. Existing titration reports retain `titration-3d-v1`; old drafts gain empty pipette/dropper defaults without losing trials.

The additive `20261028150000_leaf_starch_practicals` migration publishes separate Grade 10, 11 and 12 starch records. Existing teacher-authored labs are unchanged. The frontend deployment waits for immersive API version 5, both report types, and all six titration/starch grade records before publishing.

## Verification

Run the frontend workflow test commands and production build, plus backend tests for `src/kjsea src/submissions src/lab-sessions` and the backend TypeScript build. Science tests cover unsafe transitions, wrong results, molecular valency/connectivity, paired controls, distinct structures, grade access, report derivation and the deployment readiness gate.

Local Chromium testing uses a Grade 11 fixture, real WebGL rendering, actual tool/site clicks and independently compiled server report validation. It verifies complete paired starch trials, two molecular constructions, titration transfers, draft recovery and mobile widths. This is local verification, not confirmation of the production deployment or a live student login.
