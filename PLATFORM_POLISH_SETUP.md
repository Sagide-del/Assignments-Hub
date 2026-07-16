# Production Polish Pass — Setup & Testing Guide

Covers the design system rollout and the new refresh-token auth architecture across Unified Login, Student Dashboard, Teacher Dashboard, and School Admin Dashboard (plus Super Admin Dashboard and STEM Labs, which needed the auth changes to keep working).

## 1. Install & migrate

```bash
cd backend
npm install
npm run prisma:migrate     # applies 20260717000000_refresh_tokens
                            # (run alongside any other pending migrations)
```

No seed changes — nothing new to run there.

## 2. What changed

**Design system.** `frontend/shared/design-system.css` is now the single source of truth for color tokens, an 8px/4px spacing scale, the Poppins type scale, and a full component library (buttons, forms, cards, tables, modals, toasts, alerts, badges, tabs, loading skeletons, empty/error states) with built-in animations, responsive breakpoints, and accessibility primitives (focus-visible rings, `prefers-reduced-motion` support, skip link, `.sr-only`). It's linked into Unified Login, Student, Teacher, and School Admin dashboards. Each page's own local styles still apply on top for page-specific layout, so nothing broke, but anything not already styled locally (badges, alerts, spinners, tooltips, etc.) is now available for free. Stray emoji icons in School Admin and Teacher dashboards were replaced with Font Awesome to match the rest of the platform.

**Auth architecture.** Access tokens now expire in 15 minutes instead of 8 hours. A new refresh token (opaque, stored hashed, revocable, rotated on every use) keeps sessions alive without the user noticing — `frontend/shared/auth-client.js` handles this automatically: it patches `fetch()` to silently refresh and retry on a 401, and proactively refreshes ~60 seconds before expiry. Logging out now revokes the refresh token server-side (`POST /auth/logout`), not just a local storage clear. If a refresh token is ever reused after being rotated out (a sign of theft), every session for that user is revoked at once.

This touches every page that can log in: Unified Login, Student, Teacher, School Admin, Super Admin, and STEM Labs (the last two aren't part of the visual redesign but needed the auth wiring so they don't start logging users out every 15 minutes with no way to recover).

## 3. Try it

1. Log in from Unified Login as any role — should feel identical to before, just faster to load (no more Google Fonts round-trip, shared stylesheet is cached across pages).
2. Stay logged in and idle for 15+ minutes, then click something that hits the API — it should just work, no unexpected logout. (Silent refresh happens in the background; open the Network tab to see the `POST /auth/refresh` call.)
3. Log out from any dashboard, then check `backend`'s `refresh_tokens` table — the row for that session should have `revoked_at` set.
4. Try the "Back to Login" links (not just the Logout button) — they now revoke too.

## 4. Bugs caught and fixed during review

A verification pass on the auth changes caught: the Student and Teacher dashboards' own direct-login forms (used when opening those pages directly rather than through Unified Login) were still storing only the access token, which would have silently logged those users out after 15 minutes with no recovery. STEM Labs' login/logout (via `shared/api.js`) had the same gap. Super Admin Dashboard wasn't in the original scope but would have broken the same way once the 15-minute token lifetime took effect platform-wide, so it got the same fix. All are now wired through the same `AuthClient.storeSession()` / `AuthClient.logout()` path. A minor shadow-color mismatch between School Admin's local styles and the shared design system was also caught and aligned.
