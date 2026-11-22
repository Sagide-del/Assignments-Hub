# Guitar and Drums workspaces

Music Studio now has three primary modules: Music (the existing learning, play-along and composition tools), Guitar and Drums. The existing pathway-scoped lab router protects all three.

- Guitar: six playable strings in standard tuning; procedural nylon/steel plucked-string voices; four original melody presets; editable four-bar note grid with selectable note lengths; six chord choices per bar; strummed accompaniment.
- Drums: eight synthesized playable percussion sounds; editable 16-step 4/4 sequencer; six original style-inspired starters, including one-drop, dancehall and folk-inspired patterns. These are educational patterns, not transcriptions or claims of authentic traditional performances.
- Shared: bounded tempo (60–160 BPM), volume, looping playhead, undo, scoped browser drafts and four-bar 44.1 kHz PCM WAV downloads. Editing stops the current loop; switching modules or leaving the page releases the audio context.

Drafts are stored by user, school and module on the current device, not uploaded to the existing project database or teacher assessment workflow. The interface states this limitation. No additional backend, payment, assessment or RBAC changes are required.

Verification: music unit suite; plucked-note pitch and decay; audible, bounded audio; drum voice differences; WAV headers and browser decode; playback cleanup; undo; persisted drafts; responsive browser checks at 320, 390 and 1440 pixels. Existing music production browser regression remains green. New browser checks are included in deployment CI.

Integration with the latest main branch preserves its guided Music Journey. The journey navigation keeps the accessible Music activities labels, and the pre-existing duplicate `api` import in ExamPlayer was removed to unblock TypeScript compilation. The full frontend test sequence and production build pass on the combined version.
