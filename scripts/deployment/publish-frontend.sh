#!/usr/bin/env bash
set -euo pipefail
: "${FRONTEND_DIST:?Set FRONTEND_DIST to the tested dist directory}"
: "${EDGE_SNAPSHOT_DIR:?Run publish-verified-rbac.sh to prepare routing and rollback before publishing}"
DISTRIBUTION_ID=EC57E3OHWZ6MP
DEPLOY_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
node "$DEPLOY_SCRIPT_DIR/../../frontend/scripts/check-static-seo.mjs" "$FRONTEND_DIST"
[[ -f "$FRONTEND_DIST/index.html" ]] || { echo 'Missing frontend index.html' >&2; exit 1; }
DEPLOY_CONFIG="$(mktemp)"
trap 'rm -f "$DEPLOY_CONFIG"' EXIT
aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" --query DistributionConfig --output json > "$DEPLOY_CONFIG"
mapfile -t DEPLOY_ORIGIN < <(python3 "$DEPLOY_SCRIPT_DIR/frontend-origin.py" < "$DEPLOY_CONFIG")
[[ ${#DEPLOY_ORIGIN[@]} -ge 1 && -n "${DEPLOY_ORIGIN[0]}" ]] || { echo 'Could not resolve the S3 origin' >&2; exit 1; }
DEPLOY_DEST="s3://${DEPLOY_ORIGIN[0]}${DEPLOY_ORIGIN[1]:+/${DEPLOY_ORIGIN[1]}}/"
echo "Publishing frontend to $DEPLOY_DEST"
DEPLOY_ROUTES="${PUBLIC_ROUTE_SNAPSHOT_DIR:-$(mktemp -d)}"
if [[ ! -f "$DEPLOY_ROUTES/state.json" ]]; then
  node "$DEPLOY_SCRIPT_DIR/public-routes.mjs" prepare "${DEPLOY_ORIGIN[0]}" "${DEPLOY_ORIGIN[1]}" "$FRONTEND_DIST" "$DEPLOY_ROUTES"
fi
# Upload dependencies before HTML. Retain old bundles for browsers with cached HTML.
aws s3 sync "$FRONTEND_DIST/" "$DEPLOY_DEST" --exclude '*.html' --exclude 'routing-manifest.json' --exclude 'cloudfront-function.js' --cache-control 'public,max-age=300' --only-show-errors
aws s3 cp "$FRONTEND_DIST/assets/" "${DEPLOY_DEST}assets/" --recursive --cache-control 'public,max-age=31536000,immutable' --only-show-errors
aws s3 cp "$FRONTEND_DIST/" "$DEPLOY_DEST" --recursive --exclude '*' --include '*.html' --cache-control 'no-cache,max-age=0,must-revalidate' --only-show-errors
# Explicit replacement is essential: s3 sync can skip unchanged sitemap bytes,
# leaving the previous immutable object metadata in place.
aws s3 cp "$FRONTEND_DIST/sitemap.xml" "${DEPLOY_DEST}sitemap.xml" --content-type 'application/xml; charset=utf-8' --cache-control 'public,max-age=86400' --metadata-directive REPLACE --only-show-errors
for PRIVATE_SHELL in app.html login/index.html register/index.html 404.html; do
  aws s3 cp "$FRONTEND_DIST/$PRIVATE_SHELL" "${DEPLOY_DEST}$PRIVATE_SHELL" --content-type 'text/html; charset=utf-8' --cache-control 'no-store' --only-show-errors
done
node "$DEPLOY_SCRIPT_DIR/public-routes.mjs" publish "${DEPLOY_ORIGIN[0]}" "${DEPLOY_ORIGIN[1]}" "$FRONTEND_DIST" "$DEPLOY_ROUTES"
python3 "$DEPLOY_SCRIPT_DIR/frontend-edge.py" apply "$DISTRIBUTION_ID" "$FRONTEND_DIST" "${EDGE_SNAPSHOT_DIR:?Prepare edge routing before publishing}"
DEPLOY_INVALIDATION="$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*' --query Invalidation.Id --output text)"
echo "Waiting for CloudFront invalidation $DEPLOY_INVALIDATION"
aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION_ID" --id "$DEPLOY_INVALIDATION"
# Verify the exact public entry page, not merely an HTTP 200 from a stale cache.
DEPLOY_HOME="$(mktemp)"
curl -fsS --retry 3 --max-time 30 https://assignmenthub.co.ke/ -o "$DEPLOY_HOME"
if ! cmp -s "$FRONTEND_DIST/index.html" "$DEPLOY_HOME"; then
  rm -f "$DEPLOY_HOME"
  echo 'Upload finished, but the public homepage does not match the build. Inspect CloudFront before reporting success.' >&2
  exit 1
fi
rm -f "$DEPLOY_HOME"
node "$DEPLOY_SCRIPT_DIR/public-routes.mjs" verify "${DEPLOY_ORIGIN[0]}" "${DEPLOY_ORIGIN[1]}" "$FRONTEND_DIST" "$DEPLOY_ROUTES"
node "$DEPLOY_SCRIPT_DIR/../../frontend/scripts/check-static-seo.mjs" --live https://assignmenthub.co.ke
echo 'Verified: assignmenthub.co.ke serves the uploaded frontend and public revision documents.'
