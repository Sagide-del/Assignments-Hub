# Two-track song piano roll

Access: Music Studio → Music → Piano roll (`/student/labs/music/piano`). The existing melody editor also links to this workspace. Music, Guitar and Drums remain the three primary modules.

The supplied `my_heart_will_go_on` sketch preserves both eleven-note patterns, C Major and 100 BPM in 4/4. Since durations were not supplied, each note receives one quarter-note beat. The displayed pad pattern remains single notes, not invented full chords. This is a user-supplied study sketch, not a verified transcription, an artist recording or a rights-clearance claim.

Playback combines existing CC0 recorded piano samples with a synthesized soft pad, rendered through Web Audio. Both patterns can be inspected and edited. Export produces an audible mono PCM WAV with a short release tail. No audio starts on page load; changing songs stops playback and leaving the workspace closes its audio context.

One Love, I Am in Love and Pain in the Heart appear in the dropdown without invented artists or melodies. Their entries explain that an arrangement is needed. The JSON importer accepts two tracks (`piano`, then `synth_pad`), 1–16 notes each between C2 and C6, 4/4 time and 60–160 BPM. Imported/edited patterns persist in browser storage scoped by user, school and song; they are not uploaded to the teacher assessment catalogue.

Checks: 19 music tests; production TypeScript/build; exact supplied-note assertions; browser playback and WAV decode/energy/duration; editable tracks; missing-arrangement states; invalid JSON and valid import; draft restore; 320/390/1440px layouts; existing Music Studio save/submission/assessment regression. Browser verification is included in deployment CI.
