# Junior Science: focused investigations

## Status
Local implementation, not deployed. These three new experiences are a first flagship set, not a claim that all Grade 7–9 outcomes are covered. The official KICD website is blocked by the current cloud network policy. A narrow access draft has been saved; curriculum verification remains pending.

The current grade assignments provisionally follow the old catalogue. Do not market them as independently verified KICD grade mappings. Before publication, verify each topic against the current official grade design, record its strand/sub-strand, outcome, document edition and page, and adjust the new records if necessary. The existing taxonomy's identical broad headings for Grades 7–9 are not proof of alignment.

## Respiratory simulator quality benchmark
Keep the existing respiratory simulator intact. Reuse its principles: purposeful inspectable apparatus, responsive scientific controls, live model-derived quantities, controlled comparisons, a prediction, evidence notebook, account save/restore, separate concept checks and explicit model limits. Avoid a catalogue of decorative scenes with identical sliders.

## Implemented flagship experiences
- Filtration: fixed suspended-particle masses at four sizes; 20/100/1000 μm filter openings; mass retained versus passed; dissolved salt remains. Illustrates size separation, not potable-water certification.
- Microscopy: objectives 4×/10×/40×, fixed 10× eyepiece, focus-dependent specimen clarity, total magnification and field diameter using an 18 mm eyepiece field number. The specimen is an original AI-generated simulated onion epidermis image, clearly labelled as a simulation rather than a real micrograph. It requires science-teacher review.
- Waves: two equal-amplitude travelling waves, phase/amplitude/frequency controls, individual and resultant plots, resultant amplitude and wavelength at fixed 2 m/s speed. Completion requires a 0°/180° comparison with amplitude and frequency held constant.

Each has an explicit outcome list, local draft recovery, account notebook restore, export and two server-assessed formative checks. Written explanations remain recorded evidence, not automatically certified understanding. Additional teacher-authored questions are retained for teacher assessment separately from the built-in checks.

## Preservation and routing
New versioned keys keep legacy labs and reports separate:
- junior-science-g7-filtration-v1
- junior-science-g8-microscopy-v1
- junior-science-g9-waves-v1

The junior landing view switches to the focused catalogue only when a matching new investigation has been published for that grade, preserving the existing catalogue until then. Existing same-grade activities remain in an additional-activities section, and their old notebooks retain their existing player. Staff management is unchanged. No old labs, sessions or questions are deleted or reassigned.

`npm run labs:prepare-junior` previews proposed records without connecting to a database. `--apply` idempotently creates separate **drafts only**, preserving any existing authored records. It does not publish. No schema migration is required.

The server enforces the new evidence contract and grade match for these keys and derives measurements from events. Built-in check scores feed the Coach with the investigation topic. Server-side submission idempotency and a full teacher reasoning rubric still need a separate implementation; this change does not claim to resolve every prior lab audit finding.

## Release requirements
1. Verify official per-grade curriculum sources and record exact references.
2. Review the three experiences with an Integrated Science teacher; review the simulated epidermis artwork and optical assumptions; use a properly licensed real micrograph if positioning the specimen view as real microscopy.
3. Complete browser, phone-width, model and API tests; run real budget-phone trials.
4. Create draft records; publish only the verified grade/outcome assignments. Keep legacy records available.
5. Expand the verified flagship set according to the actual grade designs rather than adding generic experiments.

## Additional evidence received

The user supplied the 33-slide KICD Senior School curriculum-development presentation on 28 November 2026. Slide 11 supports the Junior School Integrated Science learning-area structure; slide 6 supports manageable, level-appropriate content. It does not establish per-grade science topics. See `docs/curriculum/kicd-senior-presentation-evidence.md`. The prototype grade assignments remain provisional.
