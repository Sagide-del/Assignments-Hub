# Research-led blog update — 15 November 2026

Seven static, publicly readable articles retain the green/lime visual identity. Each uses an actual build-rendered Lucide icon, a numbered series badge, one citation-linked research box and a career connection. The single CTA stays in the right column on desktop and moves immediately below the takeaways on mobile. There is no duplicated bottom CTA.

The generator rejects any article document exceeding 400 rendered words, including navigation, citations, CTA and footer. Automated tests cover all seven articles, exact library SVG markup, citation links, sitemap inclusion and mobile/desktop placement.

The new Career Compass article compares the student's interests, family hopes and Kenyan opportunities. Its CTA opens the existing `/student/my-pathway` workspace, preserving that destination after learner login. It does not promise a university admission prediction.

Detailed ten-project CSL content remains available at `/guides/csl-project-planner/`. KJSEA questions remain on the linked Grade 9 practice pages. The Mathematics article retains a compact comparison and two worked examples.

## Evidence choices

The supplied author-year references were insufficient to identify/verify the quoted claims. External primary-source retrieval was blocked by this workspace's network policy; no claim of fresh full-text verification is made. The articles instead use identifiable established publications, linked by DOI, and explain what each finding does and does not establish:

- Rohrer, Egloff & Schmukle (2015), *Examining the effects of birth order on personality*, PNAS. DOI: 10.1073/pnas.1506451112. No claimed first-born leadership-career advantage; personality results are not a career suitability test.
- OECD (2019), *PISA 2018 Results (Volume II): Where All Students Can Succeed*. DOI: 10.1787/b5fd1b8f-en. Social background and opportunity/expectations, not a claim about how Kenyan parents react to AE/BE.
- Dunlosky et al. (2013), *Improving Students' Learning With Effective Learning Techniques*. DOI: 10.1177/1529100612453266. Practice testing/distributed practice, not social-media/career causality.
- Celio, Durlak & Dymnicki (2011), *A Meta-analysis of the Impact of Service-Learning on Students*. DOI: 10.1177/105382591103400205. Service-learning outcomes, not a Kenyan hiring forecast.
- Eccles & Wigfield (2002), *Motivational Beliefs, Values, and Goals*. DOI: 10.1146/annurev.psych.53.100901.135153. Expectations/value and achievement-related choices, not a fixed-aptitude assessment or a ranked STEM blocker.

No unverified “90% of new jobs” statistic is published. Informal enterprise is discussed alongside formal employment, without implying that CSL guarantees work.

## Attribution compatibility

The new Career Compass slug joins the existing bounded attribution allowlist and confirmed-payment report. No schema migration is needed. Backend capability version 3 gates frontend publication, so the new source cannot reach an older registration/payment DTO that would reject it. Credentials, payment pricing, provider callbacks and subscription activation are unchanged.
