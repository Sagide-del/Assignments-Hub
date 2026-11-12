"""Versioned CloudFront routing with a distribution/function rollback snapshot.

No application/backend settings are changed. Requires the narrowly scoped policy
installed by enable-frontend-routing.sh. Run prepare before uploading anything.
"""
import argparse
import copy
import json
import subprocess
from pathlib import Path


def aws(*args):
    result = subprocess.run(['aws', *args, '--output', 'json'], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout) if result.stdout.strip() else {}


def config_for(previous, function_arn):
    config = copy.deepcopy(previous)
    defaults = config['DefaultCacheBehavior']
    # A stable sitemap URL must never have an immutable/year-long edge lifetime.
    sitemap = copy.deepcopy(defaults)
    sitemap['PathPattern'] = '/sitemap.xml'
    for field in ['CachePolicyId', 'OriginRequestPolicyId', 'ForwardedValues', 'MinTTL', 'DefaultTTL', 'MaxTTL']:
        sitemap.pop(field, None)
    sitemap.update({
        'MinTTL': 0, 'DefaultTTL': 86400, 'MaxTTL': 86400,
        'ForwardedValues': {'QueryString': False, 'Cookies': {'Forward': 'none'}},
        'AllowedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD'], 'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}},
    })
    behaviours = [sitemap] + [item for item in config.get('CacheBehaviors', {}).get('Items', []) if item['PathPattern'] not in ['/sitemap.xml', 'sitemap.xml']]
    config['CacheBehaviors'] = {'Quantity': len(behaviours), 'Items': behaviours}
    for behaviour in [defaults, *behaviours]:
        functions = behaviour.get('FunctionAssociations', {}).get('Items', [])
        for fn in functions:
            if fn['EventType'] == 'viewer-request' and fn['FunctionARN'] != function_arn:
                raise ValueError('An unrelated viewer-request function already exists; refusing to overwrite it.')
        if any(item.get('EventType') == 'viewer-request' for item in behaviour.get('LambdaFunctionAssociations', {}).get('Items', [])):
            raise ValueError('A viewer-request Lambda already exists; inspect it before changing routing.')
        functions = [fn for fn in functions if fn['EventType'] != 'viewer-request']
        functions.append({'FunctionARN': function_arn, 'EventType': 'viewer-request'})
        behaviour['FunctionAssociations'] = {'Quantity': len(functions), 'Items': functions}
    errors = [item for item in config.get('CustomErrorResponses', {}).get('Items', []) if item['ErrorCode'] not in [403, 404]]
    errors += [{'ErrorCode': code, 'ResponsePagePath': '/404.html', 'ResponseCode': '404', 'ErrorCachingMinTTL': 0} for code in [403, 404]]
    config['CustomErrorResponses'] = {'Quantity': len(errors), 'Items': errors}
    return config


def run(mode, distribution, dist, snapshot):
    root = Path(snapshot)
    root.mkdir(parents=True, exist_ok=True)
    name = 'assignmenthub-public-routing'
    arn = f'arn:aws:cloudfront::516962256415:function/{name}'
    state_path = root / 'state.json'
    if mode == 'prepare':
        if state_path.exists():
            raise ValueError('Edge snapshot already exists; refusing to overwrite recovery state.')
        code = Path(dist, 'cloudfront-function.js').read_bytes()
        if len(code) > 10000:
            raise ValueError('CloudFront function exceeds 10 KB.')
        current = aws('cloudfront', 'get-distribution-config', '--id', distribution)
        planned = config_for(current['DistributionConfig'], arn)
        existed = False
        previous_function = None
        try:
            previous_function = aws('cloudfront', 'describe-function', '--name', name, '--stage', 'DEVELOPMENT')
            existed = True
        except RuntimeError as error:
            if 'NoSuchFunction' not in str(error):
                raise
        live = False
        previous_live_function = None
        if existed:
            try:
                previous_live_function = aws('cloudfront', 'describe-function', '--name', name, '--stage', 'LIVE')
                aws('cloudfront', 'get-function', '--name', name, '--stage', 'LIVE', str(root / 'previous-function.js'))
                live = True
            except RuntimeError as error:
                if 'NoSuchFunction' not in str(error):
                    raise
        state_path.write_text(json.dumps({'previous': current, 'planned': planned, 'existed': existed, 'previousFunction': previous_function, 'previousLiveFunction': previous_live_function, 'live': live, 'applied': False}))
        (root / 'planned.json').write_text(json.dumps(planned))
        print('Prepared CloudFront routing and rollback snapshot. No distribution changes made.')
        return
    state = json.loads(state_path.read_text())
    if mode == 'apply':
        current = aws('cloudfront', 'get-distribution-config', '--id', distribution)
        if current['ETag'] != state['previous']['ETag']:
            raise ValueError('Distribution changed after snapshot; stop before overwriting another deployment.')
        if state['existed']:
            current_function = aws('cloudfront', 'describe-function', '--name', name, '--stage', 'DEVELOPMENT')
            if current_function['ETag'] != state['previousFunction']['ETag']:
                raise ValueError('Function changed after snapshot; refusing to overwrite another deployment.')
        # Mark before mutating: even a partially failed update needs recovery.
        state['applied'] = True
        state_path.write_text(json.dumps(state))
        options = json.dumps({'Comment': 'Assignment Hub public SEO and SPA routing', 'Runtime': 'cloudfront-js-2.0'})
        args = ['cloudfront', 'update-function' if state['existed'] else 'create-function', '--name', name, '--function-config', options, '--function-code', 'fileb://' + str(Path(dist, 'cloudfront-function.js').resolve())]
        if state['existed']:
            described = aws('cloudfront', 'describe-function', '--name', name, '--stage', 'DEVELOPMENT')
            args += ['--if-match', described['ETag']]
        function = aws(*args)
        for index, (uri, expected) in enumerate([('/', '/index.html'), ('/login', '/login/index.html'), ('/student/assignments/123', '/app.html'), ('/audit-route-that-does-not-exist', 404)]):
            event_path = root / f'event-{index}.json'
            event_path.write_text(json.dumps({'version': '1.0', 'context': {'eventType': 'viewer-request'}, 'viewer': {'ip': '127.0.0.1'}, 'request': {'method': 'GET', 'uri': uri, 'querystring': {}, 'headers': {}, 'cookies': {}}}))
            tested = aws('cloudfront', 'test-function', '--name', name, '--stage', 'DEVELOPMENT', '--if-match', function['ETag'], '--event-object', 'fileb://' + str(event_path.resolve()))
            execution = tested['TestResult']
            if execution.get('FunctionErrorMessage'):
                raise ValueError('CloudFront runtime rejected routing: ' + execution['FunctionErrorMessage'])
            result = json.loads(execution['FunctionOutput'])
            if (result.get('uri') if isinstance(expected, str) else result.get('statusCode')) != expected:
                raise ValueError('CloudFront runtime returned an unexpected route for ' + uri)
        aws('cloudfront', 'publish-function', '--name', name, '--if-match', function['ETag'])
        aws('cloudfront', 'update-distribution', '--id', distribution, '--if-match', current['ETag'], '--distribution-config', 'file://' + str((root / 'planned.json').resolve()))
        aws('cloudfront', 'wait', 'distribution-deployed', '--id', distribution)
        print('CloudFront public routing and one-day sitemap policy deployed.')
    elif mode == 'restore':
        if not state['applied']:
            return
        current = aws('cloudfront', 'get-distribution-config', '--id', distribution)
        if current['DistributionConfig'] not in [state['planned'], state['previous']['DistributionConfig']]:
            raise ValueError('Distribution was edited externally; preserve snapshot and inspect before rollback.')
        if state['live']:
            described = aws('cloudfront', 'describe-function', '--name', name, '--stage', 'DEVELOPMENT')
            restored = aws('cloudfront', 'update-function', '--name', name, '--if-match', described['ETag'], '--function-config', json.dumps(state['previousLiveFunction']['FunctionSummary']['FunctionConfig']), '--function-code', 'fileb://' + str((root / 'previous-function.js').resolve()))
            aws('cloudfront', 'publish-function', '--name', name, '--if-match', restored['ETag'])
        (root / 'previous.json').write_text(json.dumps(state['previous']['DistributionConfig']))
        aws('cloudfront', 'update-distribution', '--id', distribution, '--if-match', current['ETag'], '--distribution-config', 'file://' + str((root / 'previous.json').resolve()))
        aws('cloudfront', 'wait', 'distribution-deployed', '--id', distribution)
        print('Previous CloudFront configuration restored.')
    else:
        raise ValueError('Unknown edge operation')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['prepare', 'apply', 'restore'])
    parser.add_argument('distribution')
    parser.add_argument('dist')
    parser.add_argument('snapshot')
    args = parser.parse_args()
    try:
        run(args.mode, args.distribution, args.dist, args.snapshot)
    except RuntimeError as error:
        if 'AccessDenied' in str(error) or 'not authorized' in str(error):
            raise SystemExit('The frontend deploy role needs its one-time CloudFront routing permissions. Run scripts/deployment/enable-frontend-routing.sh in AWS CloudShell, then re-run this deployment. Original AWS error: ' + str(error)) from error
        raise
