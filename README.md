# Assignments Hub - CBC Kenya SaaS Foundation

A multi-tenant digital learning and assignment management platform designed for Kenyan Junior and Senior Schools.

Core modules:
- Multi-school tenancy
- Role-based access control
- Student admission-number login
- Assignment management
- Teacher dashboards
- Student progress tracking
- STEM Labs foundation
- Reports and subscriptions

This is the commercial SaaS foundation architecture.

## Backend status

`backend/` now contains a working NestJS + Prisma + PostgreSQL implementation
of the foundation layer:

- Multi-tenant schema (`backend/prisma/schema.prisma`) — schools, users,
  assignments, submissions, subscriptions, STEM lab sessions, audit logs.
- Authentication — staff (school code + email + password) and student
  (school code + admission number) login, JWT-based sessions.
- RBAC — Platform Admin, School Admin, Teacher, Student, enforced via
  `@Roles()` guards on every route.
- Tenant isolation — `TenantGuard` + per-service scoping ensure a school can
  only ever see its own records.
- Audit logging, bcrypt password hashing, Helmet, rate limiting.
- Assignments — teachers/admins create assignments per grade/subject;
  students see assignments matching their own grade.
- Submissions — students submit against an assignment (one per student);
  teachers/admins grade teacher-marked and practical submissions.
- STEM Labs — students log completion of a lab/simulation with CBC
  competency mapping; teachers/admins see completions school-wide.
- Subscriptions — Platform Admin creates/updates a school's plan and
  status, mirrored onto the school record; School Admin gets a read-only
  history.
- Bulk import — School Admin can upload an .xlsx to create many teachers
  and students at once (`POST /users/import`), or download a blank
  template first (`GET /users/import/template`). Teachers left without a
  password in the sheet get one auto-generated and returned once in the
  response — it's never stored in plaintext.

Everything else in this repo (`documentation/`, module specs under
`backend/modules/` and `backend/authentication/`) is the original design
spec these modules were built from.

### Running the backend locally

```bash
cd backend
cp .env.example .env        # then point DATABASE_URL at your Postgres instance
npm install
npm run prisma:migrate      # creates tables from schema.prisma
npm run prisma:seed         # creates a platform admin + demo school/users/assignment/subscription
npm run start:dev
```

The API listens on `http://localhost:3000/api/v1`. See
`backend/prisma/seed.ts` for the demo login credentials it prints.

### API surface

| Resource | Routes |
|---|---|
| Auth | `POST /auth/staff/login`, `POST /auth/student/login`, `GET /auth/me` |
| Schools | `POST /schools`, `GET /schools`, `GET /schools/:id`, `PATCH /schools/:id` |
| Users | `POST /users`, `GET /users`, `GET /users/:id`, `PATCH /users/:id` |
| Users — bulk import | `POST /users/import` (multipart .xlsx), `GET /users/import/template` |
| Assignments | `POST /assignments`, `GET /assignments`, `GET /assignments/:id`, `PATCH /assignments/:id`, `DELETE /assignments/:id` |
| Submissions | `POST /assignments/:id/submissions`, `GET /assignments/:id/submissions`, `GET /submissions`, `GET /submissions/:id`, `PATCH /submissions/:id/grade` |
| STEM Labs | `POST /lab-sessions`, `GET /lab-sessions` |
| Subscriptions | `POST /subscriptions`, `GET /subscriptions`, `GET /subscriptions/:id`, `PATCH /subscriptions/:id` |

All routes except the two login endpoints require a `Bearer` JWT and are
scoped to the caller's role/school automatically.

### Running the frontend locally

`frontend/*-dashboard/index.html` are plain HTML/JS pages (no build step)
that call the API above via `frontend/shared/api.js`. Just open them
directly in a browser once the backend is running on `localhost:3000`:

- `frontend/student-dashboard/index.html` — student login, view/submit assignments, view scores
- `frontend/teacher-dashboard/index.html` — staff login, create assignments, grade submissions
- `frontend/school-admin-dashboard/index.html` — staff login, manage school profile, add/deactivate teachers & students, bulk-import from Excel, view subscription history
- `frontend/stem-labs/index.html` — student login, complete placeholder labs, view completion history

If the API isn't on `localhost:3000`, set `window.API_BASE_URL` before
`api.js` loads (see the comment at the top of that file).

### Not yet built

There's no lab content/simulation engine yet — `stem-labs/index.html` uses
a hardcoded placeholder catalog (4 fixed labs) rather than a real lab
library, since no such model/module exists. There's also no Platform Admin
dashboard UI (only the API) — creating schools and managing subscriptions
platform-wide currently has to go through the API directly.