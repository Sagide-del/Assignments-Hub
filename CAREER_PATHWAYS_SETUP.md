# Career Pathway Assessment — Setup & Testing Guide

## 1. Install & migrate

```bash
cd backend
npm install                # pulls in pdfkit + @types/pdfkit
npm run prisma:migrate     # applies 20260716000000_career_pathways
                            # (run alongside any earlier pending migration,
                            # e.g. 20260715010000_json_exam_sections, if you
                            # haven't applied that one yet either)
npm run prisma:seed        # loads all 9 tracks across the 3 KICD pathways
```

`prisma:seed` is safe to re-run — pathways/tracks are upserted by `key`, so it won't duplicate rows.

## 2. What was built

**Database** — `Pathway` (3: STEM, Arts & Sports, Social Sciences), `Track` (9 total, JSON columns for careers/universities/skills/etc.), `StudentPathwaySelection` (history-preserving: switching tracks inserts a new row and flips the old one's `isActive` to `false`, so nothing is lost).

**Backend** (`backend/src/pathways/`) — full CRUD + read endpoints under `/pathways`: browse the catalog, get/update a student's active selection, view history, a stateless recommendation engine (`POST /pathways/recommendations`) that scores tracks against self-reported KCSE grades and interest tags, aggregated stats for teacher/school-admin/platform-admin (`GET /pathways/selections/stats`), and a PDFKit-generated report (`GET /pathways/selections/:studentId/report`).

**Frontend**
- Student Dashboard: new "Career Pathways" tab — explore all 3 pathways, take the assessment quiz, compare tracks side by side, view selection history, download a PDF report, and now also record/edit an optional "why I chose this" note on your selection.
- Teacher Dashboard: new tab showing school-wide selection stats and a filterable table of every student's current track.
- Super-Admin Dashboard: a "Career Pathways" card on the Overview tab showing platform-wide totals and the top pathways by selection count, across every school.
- STEM Labs page: the old, non-persisted, localStorage-only pathway tab has been retired and replaced with a link to the new Student Dashboard module.

## 3. Try it

1. Log in as the demo student (admission number `ADM001`).
2. Open **Career Pathways** → **Explore** → pick a track → **View Full Details** → **Select This Track** (optionally add a note first).
3. Go to **Assessment** to try the recommendation quiz, or **Compare** to see two tracks side by side.
4. From the hero card, try **Edit Notes** and **Download Report**.
5. Log in as the demo teacher/school admin — check the new Career Pathways tab for the school-wide breakdown.
6. Log in as platform admin — check the Overview tab for the platform-wide card.

## 4. Fixes made during final review

A verification pass caught three small issues before sign-off, now fixed:
- The "why I chose this track" note had no way to be entered from the UI even though the backend fully supported it — added a notes field to the track-selection modal and an "Edit Notes" action on the current-track card.
- `Track.order` (meant to control display order within a pathway) was defined in the seed data but never actually written to the database — fixed in `seed.ts`.
- The `environment` interest tag was in the quiz's vocabulary but no track referenced it — added to Pure Sciences (which includes an Environmental Scientist career path).
