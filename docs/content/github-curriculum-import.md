# Pinned GitHub curriculum source

The source is `Vincent-mutwiri/KICD-Curriculum-Designs`, pinned to commit `08760594f5390c70fd7b764abd0525f9bf2c4f69`. The supplied corpus has 80 Markdown subject files: Grade 6 has 15; Grades 7–9 have 16 each; Grade 10 has 7; Grade 11 has 8; Grade 12 has 2. This is not a complete current senior-school subject inventory.

## Build and provenance

`npm run build` in backend compiles the app, then runs `scripts/prepare-curriculum-source.mjs`. It fetches only the pinned revision using Git, reads only the manifest-listed Markdown blobs, verifies their SHA-256 hashes and builds a local source snapshot under ignored `dist/curriculum-data/`. It never installs or executes the external repository's Python or scripts. Raw documents are not committed into this repository. The upstream notices remain in the source files. The source software's MIT licence is not a substitute for authorisation to use the included curriculum materials.

`CURRICULUM_SOURCE_CHECKOUT` can point to an existing local checkout for development/CI checks; every file hash is still verified. Production builds need Git and access to the public repository. Build errors stop the deployment rather than publishing a missing snapshot. The frontend readiness check requires the matching `repositoryCurriculumSnapshot` capability from the backend.

Runtime imports read the packaged snapshot, not Google Drive or raw-GitHub endpoints. No Python service or MongoDB migration is needed; the existing PostgreSQL collections, jobs, sources and outcomes are reused.

## Admin workflow

Open **Question Bank → Create content**, choose a grade and use **Import Grade 7 curriculum snapshot** (or the selected grade). The preview lists available subjects, revisions, source links and extraction limitations. Confirm authorised source use. Imports are deduplicated against existing pinned source URLs and queued as `INGEST_GITHUB`; no content is indexed or published automatically.

Check each document's quoted outcomes. Files with known source gaps or extraction discrepancies require an explicit acknowledgement before indexing. Source metadata is preserved by the server when mappings are edited; a request cannot replace the pinned commit or erase the source audit. The advanced mapping editor supports the same acknowledgement.

Then confirm the expected subject inventory and review the extracted outcomes using the existing workflow. Questions and recall cards are generated as drafts. Approval/publication and grade-scoped student allocation remain unchanged. Missing senior subjects and unreviewed materials are not filled with invented official outcomes.

## KICD alignment and extraction

The application uses its own deterministic table parser, not the repository's incomplete Python extractor. It recognises English and Swahili outcome headings, multiple strand numbering levels, irregular header spelling, escaped table pipes and lettered outcomes. Every saved outcome has a quotation present in the cleaned source. Arithmetic symbols and variable underscores are preserved. Assessment rubric tables are not promoted into learning outcomes.

The source header must identify KICD and confirm the requested grade. Files are mapped onto the existing canonical grade/subject catalogue; subject/pathway and edition review still matter. Exact matching outcomes in the same strand/sub-strand/subject are reused instead of duplicated when another source is indexed. Distinct or changed outcomes remain unreviewed additions.

Where reviewed KICD-hosted designs are already indexed, the importer counts exact matching outcome quotations and retains the compared source IDs. Absence of an official copy is explicit. Matching some quotations does not certify the current edition, full text or syllabus completeness. The preview links to the corresponding official grade directory for comparison.

The initial snapshot parses 80 sources into 6,351 available outcome statements. Twenty-five sources have detectable gaps/discrepancies. For example, Grade 7 English's summary references later themes while the Markdown ends during Theme 8. Summary-ID checks may also expose numbering discrepancies; they are not a claim that every unmatched ID is a confirmed missing official section. The absence of a warning is not a completeness certification. No absent outcomes are invented.

## Verification

Backend tests cover extraction, quotations, hash and grade mismatch rejection, arithmetic preservation, Swahili headings, immutable manifest coverage, idempotent jobs, protected provenance and source-gap acknowledgement. A complete build fetches and audits all 80 real source files. Browser fixtures cover source preview/import, source-gap controls, subject/outcome review, generation, existing source recovery and narrow screens. These checks do not claim production database ingestion or live KICD-edition verification.
