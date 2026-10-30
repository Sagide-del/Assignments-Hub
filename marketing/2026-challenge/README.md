# Assignment Hub application and outreach pack

- **Assignment-Hub-Application-Summary.pdf** — one-page MyLittleBigThing attachment, below 10 MB.
- **Assignment-Hub-Brochure-A4.pdf** — two-page A4 brochure. Print double-sided, flip on the long edge, at actual size. All content has safe margins; no trimming or bleed is needed. For local office printing, use the printer's normal colour setting. This is an RGB digital-print PDF, not a CMYK offset-press PDF/X file.
- **Assignment-Hub-WhatsApp.png** — 1080 × 1350 portrait image for chats and social sharing.
- **Assignment-Hub-WhatsApp.pdf** — same artwork with clickable links; the image itself has a scannable QR and printed URL.

Prices supplied by the founder: schools KSh 150 per learner annually; individual learners KSh 200 monthly. Contact +254 748 519 923; website https://assignmenthub.co.ke/. No enrolment, efficacy or official curriculum endorsement claims are made.

Product previews come from the running frontend's demonstration captures and existing product artwork; displayed sample records are not evidence of learner adoption. Screenshots are framed without account sidebars. Original artwork remains unchanged.

To rebuild on Linux, install Python `reportlab` and `Pillow`, and Poppler `pdftoppm`. Run `python marketing/2026-challenge/build_pack.py` from the repository root. The script uses local DejaVu Sans fonts and local assets only. PDF typography and QR codes are vector; PNG exports are rasterised from the layout.

## Revised product-led campaign (Studio)

Use the **Assignment-Hub-Studio-** files for the redesigned campaign. These replace the initial water-led marketing layouts:

- `Assignment-Hub-Studio-Brochure-A4.pdf`: two-page product-led print brochure, with dashboard, subject library, recall, skills and 3D practical UI.
- `Assignment-Hub-Studio-Application-Summary.pdf`: one-page application attachment.
- `Assignment-Hub-Studio-WhatsApp-01.png` through `06.png`: 1080×1350 campaign series (workspace, learning journey, pricing, skills, recall and STEM).
- `Assignment-Hub-Studio-Campaign.pdf`: six social cards in one shareable PDF.
- `Assignment-Hub-Studio-Marketing-Pack.zip`: brochure, application summary, campaign PDF and six images.

`build_studio_pack.py` builds the revised layouts. It uses Open Sans fonts, vector type and QR codes, and local product captures. The new dashboard, subject-library and skills captures show the actual current frontend using sample records, not customer traction statistics. The exact original inline screenshots were not available as files; fresh captures of the same application were used. Original product screenshots and artwork are unchanged; the layout places and clips screenshot views within browser frames.

Print the A4 brochure at actual size, double-sided, flip on the long edge. It uses safe margins without bleed and requires no folding. Social PNGs are for digital sharing; print from the A4 PDF. Website and contact links are clickable in the PDFs. All prices use the founder's stated subscription rates.
