# Workstation and pendulum studios

These replace the generic three-step workshop for activities classified as `cyber` or `pendulum`. The remaining practicals keep their existing models. Exact grade/publication access continues to come from the authenticated labs API; no alternative-grade content is fabricated.

## Cybersecurity workstation

The 3D hardware includes a rounded system unit, front power switch and LED, rotating fans, monitor, keyboard, mouse, cables and desk. Students can press the physical power control or the equivalent labelled button. Power-on runs a short simulated boot sequence and opens the interactive desktop. Shutdown disconnects the practice adapter; applied policies persist in the draft.

Assignment OS is a browser-based educational desktop, not a VM or a general-purpose operating system. It has functional app launchers, a Start menu, app minimisation/closing, a taskbar, a clock, and a focus view with Escape exit.

Applications:

- Network: connect/disconnect the isolated practice adapter and inspect its documentation-range addresses.
- Security centre: apply a remote-service rule, a sign-in threshold and attachment quarantine. Settings affect the next scenario result; merely opening the app does not apply a defence.
- Lab challenges: run a service, repeated-sign-in or suspicious-attachment scenario. Compare an unprotected baseline with a matching protected retest.
- Mail: inspect a fictional message and report it, or open its attachment in the contained model. No actual HTML attachment or malware is executed.
- Event viewer: inspect derived run results and admitted/blocked counts.
- Files: read the brief, applied policy JSON and notebook summary.
- Terminal: use a small allowlist (`help`, `ipconfig`, `ping gateway`, `status`, `clear`). Other input is displayed as unsupported; no command is passed to a shell or external host.

The rule-based simulation deliberately distinguishes threats: blocking the remote service does not stop repeated sign-ins; a limit of five does not block any of a five-attempt scenario, while a limit of three blocks two. Quarantine and reporting independently protect the sample attachment. There are no external network connections or real attacks.

## Pendulum apparatus

The larger scene includes a stand, clamp, string, brass bob, degree guide, metre scale and optical-gate representation. Drag the bob to set a positive or negative release angle, or use the equivalent slider. Length, mass and angle lock during a running/paused measurement. Reset begins a fresh trial while preserving recorded readings.

The simulation integrates `theta'' = -(g/L) sin(theta)` using RK4 substeps of at most 1/240 simulated second, with `g = 9.81 m/s²`. A complete oscillation is counted when the bob returns to its release side with the corresponding turning direction. The timer stops after ten complete oscillations. It reports simulated seconds, including at 2× and 4× playback. Pause/resume does not advance simulation time while paused. A manual stopwatch offers timing practice; the recorded notebook uses the gate interval.

Recorded periods come from the integrated motion (`elapsed / cycles`), not a prefilled period slider. The backend checks each interval against the nonlinear period computed using the arithmetic–geometric mean expression for the elliptic integral. The notebook includes a period-squared versus length plot from actual recorded readings. At least three measurements across two lengths and a conclusion are required.

This is an ideal, undamped point-mass model: it omits air resistance, string elasticity/mass, support flexibility and real sensor noise. Apparatus appearance is illustrative. Refresh preserves recorded data and setup but resets an interrupted measurement.

## Persistence and validation

Both studios keep drafts scoped by student ID and lab ID, retain teacher questions/resources, export JSON notebooks and store accepted reports in existing `LabSession.completionSummary`. A saved account notebook can be explicitly loaded into an empty browser draft. Quiz responses remain part of the existing lab-session grading data. Account saving is only confirmed for the unchanged payload acknowledged by the server.

The `studio` request DTO accepts only `cyber-studio-v1` or `pendulum-studio-v1`, bounds events and conclusion length, and disallows mixing report payload types. The backend replays events, derives scenario results/periods, enforces completion, checks grade and publication, and preserves teacher-question requirements. Evidence is student-reported virtual practice, not a proctored physical-skills assessment.

`/labs/capabilities` advertises immersive version 4, both studio versions and the newer respiratory studio. Frontend publication waits for this backend capability. No database schema migration or new service credentials are needed.

Validation covers startup/power/network preconditions, defence isolation, phishing decisions, baseline/retest completion, signed-angle numerical motion versus the nonlinear reference, duplicate/impossible readings, report ownership/grade and DTO bounds. Local Chromium exercises the actual 3D power button, desktop apps, policy changes, terminal, focus exit, real integrated ten-swing intervals, report retry/save, draft recovery, mobile layouts and runtime errors using synthetic accounts and intercepted APIs. It does not claim authenticated production verification.
