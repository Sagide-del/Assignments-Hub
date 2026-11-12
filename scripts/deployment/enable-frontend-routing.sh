#!/usr/bin/env bash
# One-time additive permission setup, run in the owner's AWS CloudShell.
set -euo pipefail
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
[[ "$ACCOUNT_ID" == 516962256415 ]] || { echo 'Open CloudShell in the Assignment Hub AWS account.' >&2; exit 1; }
POLICY_FILE="$(mktemp)"
trap 'rm -f "$POLICY_FILE"' EXIT
cat > "$POLICY_FILE" <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["cloudfront:GetDistribution","cloudfront:GetDistributionConfig","cloudfront:UpdateDistribution"],"Resource":"arn:aws:cloudfront::516962256415:distribution/EC57E3OHWZ6MP"},{"Effect":"Allow","Action":["cloudfront:CreateFunction","cloudfront:DescribeFunction","cloudfront:GetFunction","cloudfront:UpdateFunction","cloudfront:PublishFunction","cloudfront:TestFunction"],"Resource":"arn:aws:cloudfront::516962256415:function/assignmenthub-public-routing"}]}
JSON
aws iam put-role-policy --role-name AssignmentHubGitHubFrontendDeploy --policy-name AssignmentHubPublicRouting --policy-document "file://$POLICY_FILE"
echo 'Frontend routing permissions configured. Re-run Deploy frontend to AWS on main.'
