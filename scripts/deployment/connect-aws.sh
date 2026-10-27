#!/usr/bin/env bash
# Run once in the AWS console's CloudShell. No access keys are copied to GitHub.
set -euo pipefail
DEPLOY_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
[[ "$DEPLOY_ACCOUNT" == 516962256415 ]] || { echo 'Open CloudShell in AWS account 516962256415.' >&2; exit 1; }
DEPLOY_TEMP="$(mktemp -d)"
trap 'rm -rf "$DEPLOY_TEMP"' EXIT
DEPLOY_BASE=https://raw.githubusercontent.com/Sagide-del/Assignments-Hub/main/scripts/deployment
for DEPLOY_FILE in frontend-origin.py publish-frontend.sh; do
  curl -fsS --retry 3 "$DEPLOY_BASE/$DEPLOY_FILE" -o "$DEPLOY_TEMP/$DEPLOY_FILE"
done
aws cloudfront get-distribution-config --id EC57E3OHWZ6MP --query DistributionConfig --output json > "$DEPLOY_TEMP/distribution.json"
mapfile -t DEPLOY_ORIGIN < <(python3 "$DEPLOY_TEMP/frontend-origin.py" < "$DEPLOY_TEMP/distribution.json")
[[ ${#DEPLOY_ORIGIN[@]} -ge 1 && -n "${DEPLOY_ORIGIN[0]}" ]] || exit 1
DEPLOY_BUCKET="${DEPLOY_ORIGIN[0]}"
DEPLOY_PREFIX="${DEPLOY_ORIGIN[1]}"
python3 - "$DEPLOY_BUCKET" "$DEPLOY_PREFIX" "$DEPLOY_TEMP" <<'PY'
import json,sys
from pathlib import Path
bucket,prefix,directory=sys.argv[1:]
root=Path(directory)
trust={'Version':'2012-10-17','Statement':[{'Effect':'Allow','Principal':{'Federated':'arn:aws:iam::516962256415:oidc-provider/token.actions.githubusercontent.com'},'Action':'sts:AssumeRoleWithWebIdentity','Condition':{'StringEquals':{'token.actions.githubusercontent.com:aud':'sts.amazonaws.com','token.actions.githubusercontent.com:sub':'repo:Sagide-del/Assignments-Hub:ref:refs/heads/main'}}}]}
objects=f'arn:aws:s3:::{bucket}/{prefix+"/" if prefix else ""}*'
policy={'Version':'2012-10-17','Statement':[
 {'Effect':'Allow','Action':['s3:ListBucket','s3:GetBucketLocation'],'Resource':f'arn:aws:s3:::{bucket}'},
 {'Effect':'Allow','Action':['s3:PutObject','s3:GetObject'],'Resource':objects},
 {'Effect':'Allow','Action':['cloudfront:GetDistributionConfig','cloudfront:CreateInvalidation','cloudfront:GetInvalidation'],'Resource':'arn:aws:cloudfront::516962256415:distribution/EC57E3OHWZ6MP'}]}
(root/'trust.json').write_text(json.dumps(trust))
(root/'policy.json').write_text(json.dumps(policy))
PY
DEPLOY_PROVIDER=arn:aws:iam::516962256415:oidc-provider/token.actions.githubusercontent.com
if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$DEPLOY_PROVIDER" > /dev/null 2>&1; then
  aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com > /dev/null
fi
aws iam add-client-id-to-open-id-connect-provider --open-id-connect-provider-arn "$DEPLOY_PROVIDER" --client-id sts.amazonaws.com
DEPLOY_ROLE=AssignmentHubGitHubFrontendDeploy
if aws iam get-role --role-name "$DEPLOY_ROLE" > /dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$DEPLOY_ROLE" --policy-document "file://$DEPLOY_TEMP/trust.json"
else
  aws iam create-role --role-name "$DEPLOY_ROLE" --assume-role-policy-document "file://$DEPLOY_TEMP/trust.json" --description 'Deploy Assignments Hub frontend from the main GitHub branch' > /dev/null
fi
aws iam put-role-policy --role-name "$DEPLOY_ROLE" --policy-name PublishAssignmentHubFrontend --policy-document "file://$DEPLOY_TEMP/policy.json"
echo 'GitHub main is now connected to the frontend bucket and CloudFront distribution.'
# Publish the already-tested STEM release immediately, using this CloudShell session.
# Do not roll back a later release if this one-time setup is run again.
curl -fsS --retry 3 --max-time 30 https://assignmenthub.co.ke/ -o "$DEPLOY_TEMP/current.html"
if ! grep -q '/assets/index-Bbt4ut3M.js' "$DEPLOY_TEMP/current.html"; then
  echo 'The live site already changed from the previous release; leaving it intact. Automation is connected.'
  echo 'For a fresh build, run Deploy frontend to AWS in the GitHub Actions tab.'
  exit 0
fi
curl -fLSs --retry 3 https://raw.githubusercontent.com/Sagide-del/Assignments-Hub/frontend-deployment-69abd1d/assignments-hub-frontend-69abd1d.zip -o "$DEPLOY_TEMP/frontend.zip"
printf '%s  %s\n' bb0d5ba79091d198fd4b7c91df87e90652299fe6bbfb289e1f12206566783258 "$DEPLOY_TEMP/frontend.zip" | sha256sum --check
mkdir "$DEPLOY_TEMP/dist"
unzip -q "$DEPLOY_TEMP/frontend.zip" -d "$DEPLOY_TEMP/dist"
FRONTEND_DIST="$DEPLOY_TEMP/dist" bash "$DEPLOY_TEMP/publish-frontend.sh"
echo 'Setup and current deployment finished. Future frontend pushes to main deploy through GitHub Actions.'
