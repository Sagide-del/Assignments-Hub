# Two-track song piano roll

Access: Music Studio → Music → Piano roll (`/student/labs/music/piano`). The existing melody editor also links to this workspace. Music, Guitar and Drums remain the three primary modules.

The supplied `my_heart_will_go_on` sketch preserves both eleven-note patterns, C Major and 100 BPM in 4/4. Since durations were not supplied, each note receives one quarter-note beat. The displayed pad pattern remains single notes, not invented full chords. This is a user-supplied study sketch, not a verified transcription, an artist recording or a rights-clearance claim.

Playback combines existing CC0 recorded piano samples with a synthesized soft pad, rendered through Web Audio. Both patterns can be inspected and edited. Export produces an audible mono PCM WAV with a short release tail. No audio starts on page load; changing songs stops playback and leaving the workspace closes its audio context.

One Love, I Am in Love and Pain in the Heart appear in the dropdown without invented artists or melodies. Their entries explain that an arrangement is needed. The JSON importer accepts two tracks (`piano`, then `synth_pad`), 1–16 notes each between A0 and C8, 4/4 time and 60–160 BPM. Imported/edited patterns persist in browser storage scoped by user, school and song; they are not uploaded to the teacher assessment catalogue.

Checks: 19 music tests; production TypeScript/build; exact supplied-note assertions; browser playback and WAV decode/energy/duration; editable tracks; missing-arrangement states; invalid JSON and valid import; draft restore; 320/390/1440px layouts; existing Music Studio save/submission/assessment regression. Browser verification is included in deployment CI.

## Uploaded How Long Will I Love You sample

A fifth dropdown entry provides the opening two bars at the printed quarter-note tempo of 60 BPM. The uploaded four-page PDF contains a cover, a watermarked score sample and blank pages; it is not the complete score. No PDF or lyrics are published with the app.

The timed melody is E4 (start 1.25, length .75), D4 (2, 1.5), C4 (3.5, .5), F4 (4, 1), G4 (5, 1), E4 (6, .5), in quarter-note beats. Gaps preserve the opening and closing rests. A separately labelled simplified pad realizes the printed C–G–F–C symbols; it is not a transcription of the full written piano accompaniment.

The read-only excerpt view shows pitched blocks with proportional duration and an explicit timing table, plus playback and WAV export. The original editable one-note-per-beat sketches and importer are unchanged. The complete song and later sample measures, including their triplets and meter changes, have not been reconstructed or invented. New tests assert tempo, note starts/durations, chord events, audible nine-second export and the five-song dropdown.


## Import compatibility fix

Track identity accepts either `instrument` or the equivalent `name` (`piano`, `synth_pad`). Explicit instrument values take precedence and invalid values are rejected rather than guessed. Parsing normalizes identifiers, note whitespace, lowercase pitch letters and Unicode accidentals. Pitch validation now covers the full A0–C8 piano range, including the user's D6 example. Errors include track/note positions. Old saved sketches retain canonical instrument fields and remain compatible.

The exact 75 BPM, two-track, sixteen-note name-only example is stored in `frontend/content/piano-import-example.json` as a regression fixture. Tests verify unchanged pitches/order, rendered D6, both voice identities, audible 13.8-second WAV including release, and reload persistence. Production build and 22 music tests pass.

## Professional editor

The one-note-per-beat screen has been superseded by the timed, polyphonic version-2 piano roll. See `professional-piano-roll.md` for editing controls, storage migration and export details. Legacy pattern JSON remains supported; it is no longer the editor's internal representation. The supplied opening score excerpt is now an editable timed project rather than a separate read-only view.
