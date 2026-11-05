#!/usr/bin/env bash
set -euo pipefail
: "${FRONTEND_DIST:?Set FRONTEND_DIST to the tested frontend build}"
: "${DEMO_TEACHER_PASSWORD:?Set the demo teacher password securely}"
: "${RBAC_ALICE_ID:?Set the Alice profile ID from the database provisioning report}"
command -v aws >/dev/null || { echo 'AWS CLI is required before publishing.' >&2; exit 1; }
node -e "require.resolve('playwright')" >/dev/null
RBAC_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# Fail without changing the frontend if backend migration/fixture/access checks fail.
node "$RBAC_SCRIPT_DIR/verify-rbac-live.mjs"
if [[ -n "${RBAC_SNAPSHOT_DIR:-}" ]]; then
  [[ ! -e "$RBAC_SNAPSHOT_DIR" ]] || { echo 'Recovery directory already exists; refusing to overwrite it.' >&2; exit 1; }
  mkdir -m 700 -p -- "$RBAC_SNAPSHOT_DIR"
  RBAC_TEMP="$RBAC_SNAPSHOT_DIR"
else
  RBAC_TEMP="$(mktemp -d)"
fi
RBAC_NEEDS_ROLLBACK=false
RBAC_DEST=''
RBAC_DISTRIBUTION=EC57E3OHWZ6MP
finish() {
  local original_status=$?
  trap - EXIT
  if [[ "$RBAC_NEEDS_ROLLBACK" == true ]]; then
    echo 'Deployment verification failed. Restoring the previous production frontend.' >&2
    if aws s3 sync "$RBAC_TEMP/previous/" "$RBAC_DEST" --cache-control 'no-cache,max-age=0,must-revalidate' --only-show-errors &&
       node "$RBAC_SCRIPT_DIR/public-routes.mjs" restore "${RBAC_ORIGIN[0]}" "${RBAC_ORIGIN[1]}" "$FRONTEND_DIST" "$RBAC_TEMP/routes" &&
       RBAC_INVALIDATION="$(aws cloudfront create-invalidation --distribution-id "$RBAC_DISTRIBUTION" --paths '/*' --query Invalidation.Id --output text)" &&
       aws cloudfront wait invalidation-completed --distribution-id "$RBAC_DISTRIBUTION" --id "$RBAC_INVALIDATION" &&
       curl -fsS --max-time 30 https://assignmenthub.co.ke/ -o "$RBAC_TEMP/restored.html" &&
       cmp -s "$RBAC_TEMP/public-before.html" "$RBAC_TEMP/restored.html"; then
      echo 'Verified: previous frontend restored.' >&2
      rm -rf -- "$RBAC_TEMP"
    else
      echo "ROLLBACK NOT VERIFIED. Preserve recovery snapshot: $RBAC_TEMP/previous/" >&2
    fi
    exit 1
  fi
  rm -rf -- "$RBAC_TEMP"
  exit "$original_status"
}
trap finish EXIT
aws cloudfront get-distribution-config --id "$RBAC_DISTRIBUTION" --query DistributionConfig --output json > "$RBAC_TEMP/distribution.json"
mapfile -t RBAC_ORIGIN < <(python3 "$RBAC_SCRIPT_DIR/frontend-origin.py" < "$RBAC_TEMP/distribution.json")
[[ ${#RBAC_ORIGIN[@]} -ge 1 && -n "${RBAC_ORIGIN[0]}" ]] || { echo 'Origin could not be resolved.' >&2; exit 1; }
RBAC_DEST="s3://${RBAC_ORIGIN[0]}${RBAC_ORIGIN[1]:+/${RBAC_ORIGIN[1]}}/"
export PUBLIC_ROUTE_SNAPSHOT_DIR="$RBAC_TEMP/routes"
node "$RBAC_SCRIPT_DIR/public-routes.mjs" prepare "${RBAC_ORIGIN[0]}" "${RBAC_ORIGIN[1]}" "$FRONTEND_DIST" "$PUBLIC_ROUTE_SNAPSHOT_DIR"
RBAC_ALIAS_EXCLUDES=()
if [[ -f "$PUBLIC_ROUTE_SNAPSHOT_DIR/excludes.txt" ]]; then
  while IFS= read -r route; do RBAC_ALIAS_EXCLUDES+=(--exclude "$route"); done < "$PUBLIC_ROUTE_SNAPSHOT_DIR/excludes.txt"
fi
aws s3 sync "$RBAC_DEST" "$RBAC_TEMP/previous/" "${RBAC_ALIAS_EXCLUDES[@]}" --only-show-errors
curl -fsS --max-time 30 https://assignmenthub.co.ke/ -o "$RBAC_TEMP/public-before.html"
cmp -s "$RBAC_TEMP/previous/index.html" "$RBAC_TEMP/public-before.html" || { echo 'S3 snapshot does not match the current public homepage. Stop before deployment.' >&2; exit 1; }
RBAC_NEEDS_ROLLBACK=true
bash "$RBAC_SCRIPT_DIR/publish-frontend.sh"
node "$RBAC_SCRIPT_DIR/verify-rbac-live.mjs"
node "$RBAC_SCRIPT_DIR/verify-rbac-browser.cjs"
node "$RBAC_SCRIPT_DIR/../../frontend/scripts/check-firstaid-assets.mjs" https://assignmenthub.co.ke
RBAC_NEEDS_ROLLBACK=false
printf '%s\n' 'Verified production frontend and teacher RBAC. No rollback required.'
