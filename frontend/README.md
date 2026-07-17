# Assignments Hub — Frontend

React + Vite + TypeScript + Tailwind SaaS frontend for the existing NestJS backend in `../backend`. See `ROADMAP.md` for what's built vs. planned, and for a list of features from the original brief that the backend doesn't support yet.

## Local development

```bash
cd frontend
npm install
cp .env.example .env   # only needed if the backend isn't on localhost:3000
npm run dev
```

Requires the backend running locally (`cd ../backend && npm run start:dev`) — see the root `README.md` (soon `backend/README.md`) for backend setup. In dev, requests to `/api/v1/*` are proxied to `http://localhost:3000` (see `vite.config.ts`); no CORS configuration needed locally.

## Structure

```
src/
├── api/            # one file per backend module, typed, matches real routes
├── app/
│   ├── providers/  # TanStack Query client
│   └── router/     # route table + role-based ProtectedRoute
├── features/       # one folder per role/domain (authentication, student, teacher, school-admin, platform-admin, parent)
├── layouts/        # PublicLayout (login pages), DashboardLayout (logged-in shell + school branding)
├── store/          # Zustand auth store (tokens + user, persisted to localStorage)
├── themes/         # runtime school branding (CSS custom properties)
└── types/          # shared TS types mirroring backend DTOs/entities
```

## Roles & routes

| Role | Login | Landing route |
|---|---|---|
| Student | `/login` (school code + admission number) | `/student` |
| Teacher | `/login/staff` (school code + email + password) | `/teacher` |
| School Admin | `/login/staff` (same form, routed by returned role) | `/school-admin` |
| Platform Admin | `/platform-console` (not linked anywhere in the public UI) | `/platform` |
| Parent | — | `/parent` (placeholder — no backend support yet) |

## Deployment

See `../render.yaml` — two Render services (`assignments-hub-api` from `backend/`, `assignments-hub-frontend` as a static site from `frontend/`, built with `npm run build` → `dist/`).
