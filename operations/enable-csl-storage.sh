#!/usr/bin/env bash
# Run from your AWS CloudShell. Grants only the current backend principal's CSL object prefix.
set -euo pipefail
command -v aws >/dev/null || { echo 'Open AWS CloudShell to run this command.' >&2; exit 1; }
command -v python3 >/dev/null
CSL_WORK="$(mktemp -d)"
chmod 700 "$CSL_WORK"
trap 'rm -rf -- "$CSL_WORK"; unset DEMO_TEACHER_PASSWORD CSL_TOKEN' EXIT
if [[ -z "${DEMO_TEACHER_PASSWORD:-}" ]]; then
  read -r -s -p 'Enter your Demo Academy teacher password (not your AWS password): ' DEMO_TEACHER_PASSWORD
  echo
fi
export DEMO_TEACHER_PASSWORD
python3 - "$CSL_WORK" <<'PY'
import os,json,sys
from pathlib import Path
p=Path(sys.argv[1])/'login-request.json'
p.write_text(json.dumps({'schoolCode':'DEMO-001','email':'otieno@demo.co.ke','password':os.environ['DEMO_TEACHER_PASSWORD']}))
p.chmod(0o600)
PY
CSL_API='https://assignments-hub-api.onrender.com/api/v1'
curl -fsS --max-time 30 -H 'Content-Type: application/json' --data-binary "@$CSL_WORK/login-request.json" "$CSL_API/auth/staff/login" -o "$CSL_WORK/login.json"
unset DEMO_TEACHER_PASSWORD
python3 - "$CSL_WORK" <<'PY'
import json,sys
from pathlib import Path
p=Path(sys.argv[1]);auth=json.loads((p/'login.json').read_text())
if auth.get('user',{}).get('role')!='TEACHER' or not auth.get('accessToken'): raise SystemExit('Demo teacher login failed. No AWS settings changed.')
h=p/'headers';h.write_text('Authorization: Bearer '+auth['accessToken']+'\n');h.chmod(0o600)
PY
curl -sS --max-time 45 -X POST -H "@$CSL_WORK/headers" "$CSL_API/csl/storage-check" -o "$CSL_WORK/storage.json"
python3 - "$CSL_WORK" <<'PY'
import json,sys,re
from pathlib import Path
p=Path(sys.argv[1]);data=json.loads((p/'storage.json').read_text())
if data.get('photo_storage_verified') and data.get('diagnostic_cleanup_verified'):
 print('Private CSL photo storage already works. No IAM changes required.');(p/'already-ready').touch();raise SystemExit
ctx=data.get('storage_diagnostic') or {};arn=ctx.get('principal_arn') or '';bucket=ctx.get('bucket') or '';prefix=ctx.get('prefix')
if not re.fullmatch(r'arn:aws:(iam|sts)::\d{12}:(user/.+|role/.+|assumed-role/.+)',arn):raise SystemExit('Could not identify a supported backend IAM principal. No AWS settings changed.')
if not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]',bucket) or bucket in ['hubfrontend','assignment-hub-frontend']:raise SystemExit('Backend must use a private files bucket, not the frontend bucket. Correct AWS_S3_BUCKET in Render first. No AWS settings changed.')
if prefix!='marketplace-private/csl/':raise SystemExit('Unexpected storage prefix; stopping without IAM changes.')
(p/'principal').write_text(arn);(p/'bucket').write_text(bucket)
policy={'Version':'2012-10-17','Statement':[{'Sid':'PrivateCSLEvidenceOnly','Effect':'Allow','Action':['s3:PutObject','s3:GetObject','s3:DeleteObject'],'Resource':f'arn:aws:s3:::{bucket}/{prefix}*'}]}
(p/'policy.json').write_text(json.dumps(policy,indent=2))
PY
if [[ -e "$CSL_WORK/already-ready" ]]; then exit 0; fi
CSL_PRINCIPAL="$(cat "$CSL_WORK/principal")"
CSL_BUCKET="$(cat "$CSL_WORK/bucket")"
CSL_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
[[ "$CSL_ACCOUNT" == "$(cut -d: -f5 <<<"$CSL_PRINCIPAL")" ]] || { echo 'CloudShell is in a different AWS account. No IAM changes made.' >&2; exit 1; }
aws s3api get-bucket-location --bucket "$CSL_BUCKET" --expected-bucket-owner "$CSL_ACCOUNT" >/dev/null
CSL_RESOURCE="${CSL_PRINCIPAL#*:$(cut -d: -f5 <<<"$CSL_PRINCIPAL"):}"
case "$CSL_RESOURCE" in
  user/*)
    CSL_IDENTITY="${CSL_RESOURCE##*/}"
    [[ "$(aws iam get-user --user-name "$CSL_IDENTITY" --query User.Arn --output text)" == "$CSL_PRINCIPAL" ]] || { echo 'IAM user identity mismatch.' >&2; exit 1; }
    echo "Granting CSL-only object access to backend user: $CSL_PRINCIPAL"
    cat "$CSL_WORK/policy.json"
    aws iam put-user-policy --user-name "$CSL_IDENTITY" --policy-name AssignmentHubPrivateCSLEvidence --policy-document "file://$CSL_WORK/policy.json"
    ;;
  role/*|assumed-role/*)
    if [[ "$CSL_RESOURCE" == assumed-role/* ]]; then CSL_IDENTITY="${CSL_RESOURCE#assumed-role/}"; CSL_IDENTITY="${CSL_IDENTITY%%/*}"; else CSL_IDENTITY="${CSL_RESOURCE##*/}"; fi
    aws iam get-role --role-name "$CSL_IDENTITY" --query Role.Arn --output text >/dev/null
    echo "Granting CSL-only object access to backend role: $CSL_IDENTITY"
    cat "$CSL_WORK/policy.json"
    aws iam put-role-policy --role-name "$CSL_IDENTITY" --policy-name AssignmentHubPrivateCSLEvidence --policy-document "file://$CSL_WORK/policy.json"
    ;;
  *) echo 'Unsupported IAM principal. No AWS settings changed.' >&2; exit 1 ;;
esac
CSL_VERIFIED=false
for CSL_ATTEMPT in 1 2 3 4 5 6; do
  curl -sS --max-time 45 -X POST -H "@$CSL_WORK/headers" "$CSL_API/csl/storage-check" -o "$CSL_WORK/verified.json"
  if python3 - "$CSL_WORK/verified.json" <<'PY'
import json,sys
p=json.load(open(sys.argv[1]));sys.exit(0 if p.get('photo_storage_verified') and p.get('diagnostic_cleanup_verified') else 1)
PY
  then CSL_VERIFIED=true;break;fi
  sleep 5
done
if [[ "$CSL_VERIFIED" != true ]]; then
 echo 'CSL-only policy saved, but live storage verification is still failing. A bucket policy, permissions boundary or organization policy may also deny access. No other policies or bucket settings were changed.' >&2
 exit 1
fi
echo 'Verified: private CSL photo upload, read and diagnostic cleanup now work. Return to Codex and say Done so deployment can finish.'
