# Music Studio

The ARTS_MUSIC route now opens the composition workspace. Access still comes from the shared persisted-grade/pathway lab configuration. Other students cannot open this route or use its project APIs.

## Composition and audio

Four serializable tracks support drag-and-drop, a keyboard/touch Add button, volume, mute, solo and removal. Play/Pause/Stop require a user gesture. Tone.js GrainPlayer stretches original loops to the selected one-bar duration at 60–180 quarter-note BPM, independently of pitch. Meters 4/4, 6/8 and 12/8 update transport timing; changing meter or the loop arrangement restarts the bar to keep tracks aligned. Howler provides individual loop previews. Audio nodes are disposed on replacement/unmount and are never saved in JSON. The level meter measures actual output samples. On small screens, Compose/Loops tabs avoid a long loop-library-first page.

## Audio provenance

The six WAV files in frontend/public/assets/music-loops/ are original synthesized teaching examples generated reproducibly by frontend/scripts/music/generate-loops.py. They are not sampled recordings or authentic transcriptions. The JSON library includes cultural notes, origin, original tempo/meter and an explicit provenance label. Isukuti notes identify the Isukha and Idakho communities; Chakacha notes refer to the Swahili coast. These introductory patterns explore rhythm, call/response and layering; they are not a complete representation of any tradition. Total audio is approximately 0.5 MB and the audio-library bundle is loaded only on this route.

## Projects

Music_Studio_Project uses the existing integer User ID, with title, BPM, meter, four-track JSON, timestamps and an owner index. GET/POST /student/music-studio/projects and GET/PUT /student/music-studio/projects/:id require the STUDENT role and ARTS_MUSIC scope. Queries bind the actor's ID after validating their school membership; another student's IDs return 404. Validation permits only six loop IDs, four unique track IDs, bounded numeric values and supported meters. No remote audio URLs or audio nodes are accepted. The list shows the most recently updated 50 projects. Account saving is explicit, with a local-device draft and JSON export for recovery. Saved status appears only after a successful server response.

The additive migration does not modify existing lab content, enrolment, payments, SBA, CSL, or teacher permissions. CI blocks frontend publication until /student/music-studio/capabilities confirms the project table is queryable. Tests include valid and invalid projects, scoped read/update isolation, real PostgreSQL persistence in a rolled-back test transaction, WAV content/duration, real non-silent browser playback, mixer/tempo/meter controls, saving/reopening, local restoration, failed-save honesty and mobile tap-to-add.
