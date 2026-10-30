# Assignment Hub application and outreach pack

- **Assignment-Hub-Application-Summary.pdf** — one-page MyLittleBigThing attachment, below 10 MB.
- **Assignment-Hub-Brochure-A4.pdf** — two-page A4 brochure. Print double-sided, flip on the long edge, at actual size. All content has safe margins; no trimming or bleed is needed. For local office printing, use the printer's normal colour setting. This is an RGB digital-print PDF, not a CMYK offset-press PDF/X file.
- **Assignment-Hub-WhatsApp.png** — 1080 × 1350 portrait image for chats and social sharing.
- **Assignment-Hub-WhatsApp.pdf** — same artwork with clickable links; the image itself has a scannable QR and printed URL.

Prices supplied by the founder: schools KSh 150 per learner annually; individual learners KSh 200 monthly. Contact +254 748 519 923; website https://assignmenthub.co.ke/. No enrolment, efficacy or official curriculum endorsement claims are made.

Product previews come from the running frontend's demonstration captures and existing product artwork; displayed sample records are not evidence of learner adoption. Screenshots are framed without account sidebars. Original artwork remains unchanged.

To rebuild on Linux, install Python `reportlab` and `Pillow`, and Poppler `pdftoppm`. Run `python marketing/2026-challenge/build_pack.py` from the repository root. The script uses local DejaVu Sans fonts and local assets only. PDF typography and QR codes are vector; PNG exports are rasterised from the layout.
