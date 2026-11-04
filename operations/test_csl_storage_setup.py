"""Exercise the CloudShell repair with fake AWS/curl; never contacts AWS."""
import json, os, pathlib, subprocess, tempfile, unittest

SCRIPT=pathlib.Path(__file__).with_name('enable-csl-storage.sh').resolve()
CURL='''#!/usr/bin/env python3
import os,sys,json,pathlib
args=sys.argv[1:];out=pathlib.Path(args[args.index('-o')+1]);d=pathlib.Path(os.environ['CSL_FIXTURE_DIR'])
if any('/auth/staff/login' in a for a in args): body={'user':{'role':'TEACHER'},'accessToken':'fixture-token'}
else:
 ready=(d/'applied').exists();body={'photo_storage_verified':ready,'diagnostic_cleanup_verified':ready,'storage_diagnostic':{'principal_arn':os.environ['MOCK_PRINCIPAL'],'bucket':os.environ['MOCK_BUCKET'],'prefix':'marketplace-private/csl/'}}
out.write_text(json.dumps(body))
'''
AWS='''#!/usr/bin/env python3
import os,sys,json,pathlib
args=sys.argv[1:];d=pathlib.Path(os.environ['CSL_FIXTURE_DIR'])
with (d/'calls').open('a') as f:f.write(json.dumps(args)+'\\n')
if args[:2]==['sts','get-caller-identity']:print(os.environ['MOCK_ACCOUNT'])
elif args[:2]==['s3api','get-bucket-location']:print('{}')
elif args[:2]==['iam','get-user']:print(os.environ['MOCK_PRINCIPAL'])
elif args[:2]==['iam','get-role']:print('arn:aws:iam::516962256415:role/backend-role')
elif args[:2] in [['iam','put-user-policy'],['iam','put-role-policy']]:
 p=pathlib.Path(args[args.index('--policy-document')+1].replace('file://',''));(d/'policy').write_text(p.read_text());(d/'applied').touch()
else:raise SystemExit('Unexpected AWS operation')
'''
class RepairTests(unittest.TestCase):
 def run_script(self,principal='arn:aws:iam::516962256415:user/apps/render-backend',account='516962256415',bucket='assignment-hub-production-files'):
  with tempfile.TemporaryDirectory() as temp:
   d=pathlib.Path(temp);bin=d/'bin';bin.mkdir()
   for name,text in [('curl',CURL),('aws',AWS)]:p=bin/name;p.write_text(text);p.chmod(0o700)
   env={**os.environ,'PATH':str(bin)+os.pathsep+os.environ['PATH'],'CSL_FIXTURE_DIR':temp,'DEMO_TEACHER_PASSWORD':'fixture-only','MOCK_PRINCIPAL':principal,'MOCK_ACCOUNT':account,'MOCK_BUCKET':bucket}
   result=subprocess.run(['bash',str(SCRIPT)],env=env,text=True,capture_output=True,timeout=20)
   policy=json.loads((d/'policy').read_text()) if (d/'policy').exists() else None
   calls=[json.loads(line) for line in (d/'calls').read_text().splitlines()] if (d/'calls').exists() else []
   return result,policy,calls
 def test_user_receives_only_csl_object_permissions(self):
  r,p,c=self.run_script();self.assertEqual(r.returncode,0,r.stderr)
  self.assertEqual(p['Statement'],[{'Sid':'PrivateCSLEvidenceOnly','Effect':'Allow','Action':['s3:PutObject','s3:GetObject','s3:DeleteObject'],'Resource':'arn:aws:s3:::assignment-hub-production-files/marketplace-private/csl/*'}])
  self.assertTrue(any(x[:2]==['iam','put-user-policy'] for x in c));self.assertNotIn('fixture-only',r.stdout)
 def test_assumed_backend_role_is_supported(self):
  r,p,c=self.run_script(principal='arn:aws:sts::516962256415:assumed-role/backend-role/test-session');self.assertEqual(r.returncode,0,r.stderr);self.assertTrue(any(x[:2]==['iam','put-role-policy'] for x in c))
 def test_different_account_is_rejected_without_mutation(self):
  r,p,c=self.run_script(account='111111111111');self.assertNotEqual(r.returncode,0);self.assertIsNone(p);self.assertFalse(any('put-user-policy' in x or 'put-role-policy' in x for x in c))
 def test_frontend_bucket_is_rejected_without_mutation(self):
  r,p,c=self.run_script(bucket='hubfrontend');self.assertNotEqual(r.returncode,0);self.assertIsNone(p);self.assertFalse(c)
if __name__=='__main__':unittest.main()
