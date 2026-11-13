# Music production workspace

## Library and provenance

The catalog contains thirteen playable original exercises, public-domain themes and supplied-note studies and five commercial listening references. Genres include Isukuti, Benga, Rhumba, Chakacha, Gospel, Afrobeat, Western Pop and South African Pop. Rhythms and melodies vary by exercise; Ocean Ballad has a softer arrangement and Township Pop Groove uses a minor-key syncopated pattern.

My Heart Will Go On (Céline Dion), Vulindlela and Weekend Special (Brenda Fassie), Jambo Bwana (Them Mushrooms), and Malaika (popular recording by Fadhili William) are listening-reference cards. They link to recording searches and supply no recordings, lyrics, melodies or scores. They are not downloadable mixer material.

Mwana wa Mberi Neshikhoyero is explicitly a supplied-note study: the owner provided the opening notes for SATB, C major, 90 quarter-note BPM, 6/8, and an instrumentation list. The study retains those opening notes and uses original additional bars and teaching accompaniment. It does not claim to reproduce the complete W. Obanda arrangement. The other staves are study accompaniment; playback and MP3 export follow the student's six-track mix.

Ode to Joy, Twinkle Twinkle, and Frère Jacques are four-bar public-domain theme studies with original accompaniment. These provide familiar melodies students can arrange and export.

The public catalog and backend canonical JSON are kept identical. The additive migration seeds 18 stable catalog entries without overwriting future edited rows. Music_Song and Music_Project are separate from the existing Music_Studio_Project table, preserving all loop projects. Student IDs and foreign keys follow the existing integer users table mapping.

## Activities and notation

Music students open the new arrangement workspace at /student/labs/music. Existing Loop Studio projects remain accessible at /student/labs/music/loops. Five additional routes are /rhythm, /melody, /instrument, /composition, /production, with /studio as an arrangement alias. The shared lab router gates every activity by saved grade/pathway/track. The sidebar and dashboard use Music2, and the backend Music config returns icon=Music.

The activities practise pulse, ostinato/call-response, scales, four-bar melodic shape, timbre, balance, arrangement and reflection, with additional prompts for Grades 11–12. This is curriculum-oriented skill practice, not a claim of KICD certification or a complete verified curriculum design. Activity completion markers are learner self-reports; teacher assessment remains explicit.

VexFlow renders real notes, rests, clefs, key and time signatures for SATB, Organ, Acoustic Guitar, Acoustic Bass and two Drumset staves. The current bar is highlighted during playback. The note editor allows C Major, A Minor and Pentatonic scales. Pattern lengths are 16 sixteenths in 4/4, 12 in 6/8, and 24 in 12/8. Note lengths and patterns are validated, and changing meter resizes/quantizes them without overlaps. Instrument practice provides synthesized Piano, Marimba, Kalimba, Nyatiti, Sitar and Erhu teaching voices; these are not samples of authentic instruments.

## Audio and export

One Tone.js scheduler drives live playback and offline rendering of Melody, Isatsa, Ikhasi, Omwana, Gong and Rattles. Each track has level and mute controls; five percussion tracks have step editors. Tone.Offline renders the four-bar mix to PCM in the browser. The maintained @breezystack/lamejs package is installed under the lamejs alias for MP3 encoding, avoiding the broken legacy encoder build. @tonejs/midi exports the original melody as MIDI. MP3 downloads include the mix title and learner name. Audio is not uploaded; mp3_url remains nullable, and teachers reconstruct playback from the saved musical data.

## Persistence and assessment

Authenticated /music-production routes provide the catalog and owner-scoped production projects. Payloads require exactly six known tracks, supported meters, bounded tempo/levels, a valid non-overlapping four-bar melody, bounded reflection and known activity markers. Unknown JSON properties are stripped before storage. Listening reference IDs cannot be loaded as playable exercises.

Submission saves an immutable musical-data snapshot. Editing a submitted or assessed mix creates a new draft copy rather than changing the teacher's snapshot. Existing /student/music-studio/projects endpoints retain their original four-track format and behavior.

/music-production/teacher/submissions and its assessment PATCH reuse TeacherScopeGuard and teacherPairs. The service additionally filters to Music/Music & Dance subject pairs, retaining each subject's stream and grade together. Teachers cannot see or assess another stream via an unrelated Physics assignment, or another school. Assessments store a score and specific feedback, visible when the learner reopens the project. They do not automatically alter SBA or external examination records.

## Verification and delivery

Backend tests cover model/DTO validation, reference-only data, genre variation, owner scope, snapshot immutability and real PostgreSQL teacher isolation. Frontend tests check meter totals and score duration, melody editing, reference boundaries and catalog consistency. Browser tests exercise notation, all five activities, icon choice, recording-reference links, real MP3 export and decode with non-silent samples, saving/submission/assessment, and mobile layout. CI blocks publication until the live production API, both tables and all 18 catalog rows are available.
