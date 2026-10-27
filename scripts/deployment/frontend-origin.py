"""Resolve the default CloudFront S3 origin; never guess the frontend bucket."""
import json
import re
import sys

config = json.load(sys.stdin)
target = config['DefaultCacheBehavior']['TargetOriginId']
origin = next((item for item in config['Origins']['Items'] if item['Id'] == target), None)
if origin is None:
    raise SystemExit('The default origin is an origin group; inspect it before deploying.')
domain = origin['DomainName']
match = re.fullmatch(r'([a-z0-9][a-z0-9.-]+)\.s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com', domain)
if not match:
    raise SystemExit(f'Default origin is not a recognised S3 endpoint: {domain}')
bucket = match.group(1)
prefix = origin.get('OriginPath', '').strip('/')
if '..' in prefix.split('/') or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_.-' for c in prefix):
    raise SystemExit('Unexpected origin path; inspect it before deploying.')
print(bucket)
print(prefix)
