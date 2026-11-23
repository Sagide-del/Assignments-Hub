# Professional piano roll — 23 November 2026

Music Studio → Music → Piano roll now uses a compact dark editor with a full 88-key piano, pitch lanes, cyan labelled notes, bar/beat ruler, minimap, playback cursor and velocity lane. Expand opens a larger workspace; Escape closes it. The existing Music, Guitar and Drums module navigation remains intact.

## Editing

- Pencil draws notes and supports dragging a new note to lengthen it. Existing notes drag in time and pitch; the right edge resizes duration.
- Shift-click or the selection tool's box selects multiple notes. Group movement preserves timing and pitch intervals at boundaries.
- Eraser, right-click or Delete removes notes. Duplicate and local copy/paste create new note identities; copies must fit inside the pattern and track limits.
- Arrow keys nudge by the chosen snap or a semitone; Shift+Up/Down moves an octave. Ctrl/Cmd+A selects the channel, Ctrl/Cmd+D duplicates, Ctrl/Cmd+C/V copies/pastes, Ctrl/Cmd+Z undoes, and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes.
- Selected-note fields edit pitch, start, duration and velocity. Numeric fields accept intermediate typed values and commit on Enter or blur; Escape cancels entry, arrows step values.
- Snap offers 1/16, 1/8 and quarter notes. The duration selector sets new-note length. Horizontal zoom/Fit and the hand/pan tool support desktop and touch navigation.
- The velocity lane reflects actual values; selecting a stem exposes that note's velocity control. Selected-channel volume and mute affect both playback and keyboard audition.

## Playback and exports

Play/Pause, Stop, loop, metronome, tempo, master level and bar count are functional. Space toggles playback while the editor has keyboard focus. The ruler seeks by beat. Playback uses AudioContext time for position; edited projects pause playback so the next render uses the new data. Recorded CC0 piano samples and a modeled soft pad retain independent per-note timing and velocity. Polyphonic notes, rests and sustained/dotted values are preserved.

WAV renders the full pattern range plus a one-second release allowance; metronome clicks are playback-only. MIDI retains note pitches, positions, lengths, velocities, tempo and channel identities. Muted/zero-level channels are excluded from sounding MIDI events. Project JSON is an editable version-2 backup, not a flattened note list.

Limits: 1–16 bars in 4/4, 60–160 BPM, two channels, 256 notes per channel, A0–C8, velocity 1–127. Exported projects are validated before import. The old two-track `pattern` JSON remains accepted, including `name` aliases and D6.

## Saved-data compatibility

New device drafts use `ah-piano-roll-v2:<user>:<school>:<song>`. Existing `ah-piano-song-v1` drafts are read and converted without deleting or overwriting their original entries. Imported legacy notes retain their pitches/order and receive one beat per note. A v2 draft is persisted when edited. Undo/redo keeps up to 40 in-session project snapshots. Drafts are device-local; use Project JSON for an editable backup.

The previously supplied two-bar score excerpt loads as timed melody and chord notes with its source/limitation notice. It is now editable; the supplied reference remains available for reloading. No extra copyrighted repertoire, lyrics or commercial recordings were generated or bundled.

No backend, payment, teacher RBAC, SBA, CSL or database migrations were changed. The existing teacher-assessed composition workflow remains separate and available under Compose.

## Verification

- Production TypeScript/Vite/static-page build passed.
- 28 music tests passed, including lossless legacy conversion, polyphony and rests, validation, group bounds, resize/duplicate safety, and MIDI recovery using an independent MIDI reader.
- Browser checks passed for legacy restoration without overwriting v1, draw/move/resize, chords, selection/clipboard, deletion/undo/redo, typed numeric editing, seeking/playhead/pause/loop, metronome, mute, velocity-dependent WAV energy, MIDI/JSON/WAV exports, reload persistence, timed score data, zoom/expand and 320/390/1440px layouts.
- Existing Music Studio and Guitar/Drums browser regressions passed.
