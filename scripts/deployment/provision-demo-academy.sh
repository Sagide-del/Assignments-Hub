#!/usr/bin/env bash
# Run from backend/ in the production Render Shell, not in a local workspace.
set -euo pipefail
[[ -f dist/src/scripts/operations/demo-academy.js && -f prisma/schema.prisma ]] || {
  echo 'Wait for the new backend deployment to be Live, then run from backend/.' >&2; exit 1;
}
command -v node >/dev/null
[[ -n "${DATABASE_URL:-}" ]] || { echo 'The hosting DATABASE_URL is missing.' >&2; exit 1; }
umask 077
if [[ -z "${DEMO_TEACHER_PASSWORD:-}" ]]; then
  read -r -s -p 'Enter the demo teacher password from your request: ' DEMO_TEACHER_PASSWORD
  printf '\n'
fi
export DEMO_TEACHER_PASSWORD
# CLI only; do not invoke npm start or the taxonomy/general seed.
npx --no-install prisma migrate deploy
node dist/src/scripts/operations/demo-academy.js
DEMO_REPORT="$(mktemp)"
trap 'rm -f -- "$DEMO_REPORT"; unset DEMO_TEACHER_PASSWORD' EXIT
node dist/src/scripts/operations/demo-academy.js --apply > "$DEMO_REPORT"
cat "$DEMO_REPORT"
RBAC_ALICE_ID="$(node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!Number.isSafeInteger(r.students.AW002))process.exit(1);process.stdout.write(String(r.students.AW002));' "$DEMO_REPORT")"
export RBAC_ALICE_ID
node ../scripts/deployment/verify-rbac-live.mjs
printf '\n%s\n' 'Backend checks passed. Configure the GitHub Actions secret RBAC_DEMO_TEACHER_PASSWORD and repository variable RBAC_DEMO_ALICE_ID, then run Deploy frontend to AWS on main.'
printf 'RBAC_DEMO_ALICE_ID=%s\n' "$RBAC_ALICE_ID"
