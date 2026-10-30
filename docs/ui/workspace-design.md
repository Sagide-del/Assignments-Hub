# Workspace UI conventions

The shared dashboard shell loads `frontend/src/workspace.css`. Page headers and reusable cards live in `components/ui/Saas.tsx`. Learner library pages use the same page heading, spacing and focus treatment. The shell is shared with school, teacher and platform consoles; their role-specific routes and controls remain intact.

Typography uses locally hosted Open Sans (400/600/700), with system fallbacks, `font-display: swap` and no third-party font requests. Font attribution and Apache 2.0 license are shipped under `public/fonts/`. The WOFF2 files were generated from the system Open Sans distribution with fontTools and Brotli. Browser inputs retain 16px text on narrow screens to avoid automatic zoom.

Keep headings short and contextual. Generated assignment headings use `assignment-presentation.ts` for display; original values remain available for search, grouping, navigation and full-title access. Do not rename stored content or discard coverage to fit a card.

Remove repeated introductions from module libraries. Retain task instructions, lab safety, save state, assessment rules, access and payment conditions. Put background explanations behind labelled disclosures when useful. Learning activities and official-source context remain available in Resources. Untouched skill libraries avoid an empty row of progress statistics.

Do not add blanket overrides that recolour every brand background, flatten every card radius or hide paragraphs. Those previous overrides were removed from `index.css`; authored educational content, recall sheets and 3D canvases should retain their intended visual hierarchy. Preserve per-school colour variables.

Verification for this pass: 104 frontend tests; ten learner tabs at 1440/390/320px; assignment and review flows; recall rendering/printing and admin card editing; timed exam save/offline/expiry flows; respiratory 3D selection, observation, recovery and mobile checks. The print sample remained one A4 page.

## Neutral navigation and density

Use neutral charcoal, white and slate for navigation, selected tabs and focus states. Keep semantic result/warning colours and the original branded artwork. Do not reintroduce neon active-tab icons, a lime sidebar stripe, dashboard greeting/date blocks or decorative dashboard illustrations. The learner profile remains available for account identification.

Compact Assignment Hub branding now clips the mark directly from `/logo.png`, the same original image used by the wordmark; it is not a redrawn SVG symbol. Uploaded school logos and school-initial fallbacks remain supported. Independent accounts use the platform mark rather than inheriting a school placeholder logo.
