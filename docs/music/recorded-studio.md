# Music Studio: recorded practice and navigation

Three workspaces: Play along (default), Compose, My projects. Loop studio remains available with all existing saved projects and local drafts. Compositions retain the existing six-track/version-2 format; optional bounded play_along controls persist a five-stem backing session. No database migration is required. Submitted teacher-review snapshots remain immutable and school/stream authorization is unchanged.

The default four-bar Ode to Joy study is our original accompaniment to a public-domain theme, rendered from recorded CC0 VSCO 2 Community Edition samples. Five synchronized parts: marimba melody, upright piano, acoustic bass, violin pad and acoustic percussion. Controls include count-in, bar-range repeat, seeking, mute/solo, volume, stereo pan, live piano and optional browser Web MIDI input. MP3 export contains the full four-bar backing mix; it does not capture live keyboard input. Playback is user initiated. Samples load on demand and decode once per browser session. Prepared assets total about 1.2 MB.

Piano and Marimba composer voices now use recordings. Isukuti, Nyatiti and other unrecorded voices remain explicitly modeled; the orchestral percussion is not presented as authentic Kenyan field recording. Commercial catalog entries remain listening references, with no supplied recordings, lyrics or scores.

Asset provenance, source checksums, converted checksums and full CC0 licence: frontend/public/assets/music/recorded/. Rebuild with Python 3 and ffmpeg: `python frontend/scripts/music/prepare-recorded-sounds.py`. Source repository is pinned to a reviewed revision. No third-party API calls or per-play AI costs.

Verification: frontend type/build, backend build, frontend test suites, backend unit suites, music browser tests with real MP3 decoding and stereo-channel energy analysis, desktop/mobile screenshots, owner save/reopen, legacy loop and pathway-router browser checks. Database-backed integration checks also run in deployment CI against an isolated PostgreSQL database.
