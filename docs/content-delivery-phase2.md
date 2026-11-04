# Phase 2: student learning library

The new Learning library is linked from My Study Hub at `/student/study-hub/library`. Existing purchased-resource library and bookmarks are unchanged.

`GET /library?grouped=true` returns Subject → Topic → Batches, using the existing fresh grade/pathway/track and publication/audience/subscription scope. Default `GET /library` remains a flat safe metadata catalogue for existing clients. Actual publication values are PUBLISHED_STORE and PUBLISHED_SCHOOL, rather than an unsupported PUBLISHED enum.

Cards show actual question totals, a cheat-sheet badge only for validated structured theory, and a 3D Lab badge only for LAB_3D modules. Asset URLs alone do not imply an interactive lab. Search filters subject/topic names locally. Each batch can be opened separately.

`GET /library/modules/:id` returns safe metadata and a validated cheat sheet, never question answers. Practice uses existing CMS materialisation and the assessment workspace.

`GET /library/modules/:id/cheatsheet.pdf` rechecks the same scope and publication access, returns 403 for unavailable content and 404 when no structured sheet exists. Puppeteer produces an A4 PDF with Assignment Hub branding, diagram, concepts, KaTeX formulas and mistakes. The renderer embeds its logo/fonts locally, escapes text, disables JavaScript, blocks network requests, limits concurrency and closes Chromium in finally. It uses LIBRARY_CHROMIUM_EXECUTABLE if configured, otherwise the installed Sparticuz Chromium binary. No extra environment variable or database migration is required in production.

Tests cover scope/publication/stream isolation, safe previews, revocation, actual authenticated PDF downloads, HTML escaping and search. Public `/library/capabilities` is the CI readiness gate. Payment, Teacher RBAC, SBA, CSL and illustration code are unchanged. Phase 3 awaits separate approval.
