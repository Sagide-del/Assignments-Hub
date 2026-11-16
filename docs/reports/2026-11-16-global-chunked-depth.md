# Global “Chunked Depth” publishing — 16 November 2026

Applied to all seven existing public guides through the actual static publishing pipeline. The application is React/Vite with build-generated public HTML, so no unused Next.js route was added. Existing canonical URLs, green/lime palette, typography, navigation, homepage, app modules and authentication are preserved.

## Shared structure

Every article now has the Assignment Hub brand introduction above its title and an automatically generated, native expandable contents list below the hero. Contents links are generated from H2/H3 headings, preserve useful existing IDs and disambiguate duplicate anchors.

The editorial copy contains exactly three takeaways, a short answer, a cited purple research box, sectioned main content, three to five native FAQs with matching FAQPage schema, a career connection, and one relevant closing CTA. Four curated related guides appear in a 2×2 grid. Contextual links within the main content connect the topic cluster; unknown internal destinations fail publishing.

Rendered editorial word counts exclude navigation, repeated contents entries and related-card titles:

| Guide | Words |
| --- | ---: |
| CBC grading | 926 |
| Senior-school pathways | 943 |
| KJSEA revision | 926 |
| CSL projects | 976 |
| Core vs Essential Mathematics | 943 |
| Grade 7 fractions | 955 |
| Career Compass | 1,078 |

Read time is calculated from actual copy. Paragraphs are rendered in groups of at most two sentences. The prior short-post and special Career Compass limits are replaced by a global 800–1,200-word build guard.

## Visuals and evidence

Staged generated covers are replaced by seven original explanatory SVG diagrams: CBC evidence-to-action guidance; STEM areas in the dated KICD 2019 framework; an illustrative spaced-revision routine; the five CSL steps; Mathematics examples; accurately proportioned fraction bars; and the three-way career conversation. SVG sources are small and scalable, with alt text, titles/descriptions, full-size links and matching JPEG sharing images. Image captions no longer obscure diagram footnotes.

The diagrams contain no invented survey results or learner outcomes. Existing research citations and their limits are retained; no unverified birth-order, employment or national-hours claim has been introduced. The detailed CSL planner and working Career Compass checklist remain available.

## Future authoring

1. Add metadata/research/CTA to `frontend/content/research-guides.mjs` and structured copy to `frontend/content/deep-guides.mjs`.
2. Provide three takeaways, at least four substantive sections, 3–5 FAQs, and four distinct related slugs. Use `[[label|/blog/known-slug/]]` for contextual links.
3. Add a custom diagram in `generate-blog-diagrams.mjs` and map it in `blog-artwork.mjs`.
4. Run `node frontend/scripts/generate-blog-diagrams.mjs --authoring`, then `render-blog-diagrams.cjs` with Playwright/Chromium available. Commit SVGs, matching JPEGs and their provenance manifest.
5. Run revision/content tests and the production build. Builds reject missing deep copy, out-of-range word counts, invalid related guides, broken editorial links, missing artwork and stale SVG/sharing-image pairs.

Production builds only generate/check deterministic SVG files; they do not require a new image-generation API or browser dependency. No per-visit AI generation is added.

## Verification

Content tests cover all seven word ranges, schema-visible FAQ consistency, heading/contents anchors, related links, metadata preservation, safe links, diagram source/share hashes and fraction-bar proportions. Browser checks cover JavaScript-disabled reading, native contents/FAQ interactions, mobile/desktop layouts, images and CTAs, plus the existing checklist, sign-in handoff and free-practice flows.
