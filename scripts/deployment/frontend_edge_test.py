import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('frontend_edge', Path(__file__).with_name('frontend-edge.py'))
edge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(edge)
ARN = 'arn:aws:cloudfront::516962256415:function/assignmenthub-public-routing'

class RoutingConfigTests(unittest.TestCase):
    def config(self):
        return {'DefaultCacheBehavior': {'TargetOriginId': 'private-s3', 'ViewerProtocolPolicy': 'redirect-to-https', 'CachePolicyId': 'old-policy', 'FunctionAssociations': {'Quantity': 1, 'Items': [{'EventType': 'viewer-response', 'FunctionARN': 'headers-function'}]}}, 'CustomErrorResponses': {'Quantity': 2, 'Items': [{'ErrorCode': 403, 'ResponseCode': '200', 'ResponsePagePath': '/index.html'}, {'ErrorCode': 500, 'ErrorCachingMinTTL': 20}]}}

    def test_missing_objects_retain_real_404_status(self):
        original = self.config()
        result = edge.config_for(original, ARN)
        errors = result['CustomErrorResponses']['Items']
        for code in [403,404]:
            item = next(x for x in errors if x['ErrorCode'] == code)
            self.assertEqual(item['ResponseCode'], '404')
            self.assertEqual(item['ResponsePagePath'], '/404.html')
            self.assertEqual(item['ErrorCachingMinTTL'],0)
        self.assertEqual(original['CustomErrorResponses']['Items'][0]['ResponseCode'],'200')
        self.assertTrue(any(x['ErrorCode']==500 for x in errors))

    def test_sitemap_edge_ttl_is_one_day_and_other_behaviours_survive(self):
        previous=self.config()
        previous['CacheBehaviors']={'Quantity':1,'Items':[{'PathPattern':'assets/*','TargetOriginId':'assets-origin','ViewerProtocolPolicy':'https-only','CachePolicyId':'immutable-assets'}]}
        result=edge.config_for(previous,ARN)
        sitemap=result['CacheBehaviors']['Items'][0]
        self.assertEqual(sitemap['PathPattern'],'/sitemap.xml')
        self.assertEqual(sitemap['MaxTTL'],86400)
        self.assertEqual(sitemap['DefaultTTL'],86400)
        self.assertEqual(sitemap['MinTTL'],0)
        self.assertNotIn('CachePolicyId',sitemap)
        self.assertEqual(sitemap['ForwardedValues']['Headers'], {'Quantity': 0})
        self.assertEqual(sitemap['ForwardedValues']['QueryStringCacheKeys'], {'Quantity': 0})
        self.assertEqual(result['CacheBehaviors']['Items'][1]['CachePolicyId'],'immutable-assets')

    def test_preserves_response_function_and_rejects_unrelated_request_function(self):
        result=edge.config_for(self.config(),ARN)
        self.assertEqual(result['DefaultCacheBehavior']['FunctionAssociations']['Quantity'],2)
        previous=self.config()
        previous['DefaultCacheBehavior']['FunctionAssociations']['Items'].append({'EventType':'viewer-request','FunctionARN':'another-product'})
        with self.assertRaises(ValueError):edge.config_for(previous,ARN)

    def test_idempotent_and_refuses_viewer_request_lambda(self):
        result=edge.config_for(self.config(),ARN)
        self.assertEqual(edge.config_for(result,ARN),result)
        previous=self.config()
        previous['DefaultCacheBehavior']['LambdaFunctionAssociations']={'Quantity':1,'Items':[{'EventType':'viewer-request'}]}
        with self.assertRaises(ValueError):edge.config_for(previous,ARN)


# Exercise prepare/apply/restore with an in-memory AWS contract. Never contacts AWS.
import copy
import json
import tempfile
from unittest.mock import patch

class EdgeDeploymentTests(unittest.TestCase):
    def test_apply_and_rollback_restore_the_previous_distribution(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'dist').mkdir()
            (root/'dist/cloudfront-function.js').write_text('function handler(e){return e.request;}')
            original=RoutingConfigTests().config()
            state={'config':copy.deepcopy(original),'etag':'d1','created':False,'function_etag':'f1'}
            def fake(*args):
                action=args[1]
                if action=='get-distribution-config':return {'ETag':state['etag'],'DistributionConfig':copy.deepcopy(state['config'])}
                if action=='describe-function':
                    if not state['created']:raise RuntimeError('NoSuchFunctionExists')
                    return {'ETag':state['function_etag']}
                if action=='create-function':
                    state['created']=True
                    return {'ETag':state['function_etag']}
                if action=='test-function':
                    event=json.loads(Path(args[args.index('--event-object')+1][8:]).read_text())
                    uri=event['request']['uri']
                    outputs={'/':'/index.html','/login':'/login/index.html','/student/assignments/123':'/app.html'}
                    output={'uri':outputs[uri]} if uri in outputs else {'statusCode':404}
                    envelope={'request':output} if uri in outputs else {'response':output}
                    return {'TestResult':{'FunctionOutput':json.dumps(envelope)}}
                if action=='update-distribution':
                    self.assertEqual(args[args.index('--if-match')+1],state['etag'])
                    state['config']=json.loads(Path(args[args.index('--distribution-config')+1][7:]).read_text())
                    state['etag']+='x'
                    return {}
                if action in ['wait','publish-function']:return {}
                raise AssertionError(args)
            with patch.object(edge,'aws',side_effect=fake):
                edge.run('prepare','D',root/'dist',root/'snapshot')
                self.assertEqual(state['config'],original)
                edge.run('apply','D',root/'dist',root/'snapshot')
                self.assertEqual(state['config']['CustomErrorResponses']['Items'][-1]['ResponseCode'],'404')
                edge.run('restore','D',root/'dist',root/'snapshot')
                self.assertEqual(state['config'],original)

    def test_existing_routing_updates_function_without_rewriting_distribution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'dist').mkdir()
            (root / 'dist/cloudfront-function.js').write_text('function handler(e){return e.request;}')
            original = edge.config_for(RoutingConfigTests().config(), ARN)
            calls = []
            def fake(*args):
                calls.append(args)
                action = args[1]
                if action == 'get-distribution-config':
                    return {'ETag': 'stable', 'DistributionConfig': copy.deepcopy(original)}
                if action in ['describe-function', 'update-function']:
                    return {'ETag': 'function', 'FunctionSummary': {'FunctionConfig': {'Comment': 'Existing live config', 'Runtime': 'cloudfront-js-2.0'}}}
                if action == 'get-function':
                    Path(args[-1]).write_text('previous function')
                    return {}
                if action == 'test-function':
                    event = json.loads(Path(args[args.index('--event-object') + 1][8:]).read_text())
                    uri = event['request']['uri']
                    routes = {'/': '/index.html', '/login': '/login/index.html', '/student/assignments/123': '/app.html'}
                    result = {'request': {'uri': routes[uri]}} if uri in routes else {'response': {'statusCode': 404}}
                    return {'TestResult': {'FunctionOutput': json.dumps(result)}}
                if action == 'publish-function':
                    return {}
                raise AssertionError('Unexpected AWS operation: ' + str(args))
            with patch.object(edge, 'aws', side_effect=fake):
                edge.run('prepare', 'D', root / 'dist', root / 'snapshot')
                edge.run('apply', 'D', root / 'dist', root / 'snapshot')
                edge.run('restore', 'D', root / 'dist', root / 'snapshot')
            self.assertTrue(any(call[1] == 'test-function' for call in calls))
            self.assertEqual(sum(call[1] == 'publish-function' for call in calls), 2)
            self.assertFalse(any(call[1] in ['update-distribution', 'wait'] for call in calls))

    def test_permission_denial_during_prepare_never_mutates_distribution(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'dist').mkdir()
            (root/'dist/cloudfront-function.js').write_text('function handler(e){return e.request;}')
            def fake(*args):
                if args[1]=='get-distribution-config':return {'ETag':'e','DistributionConfig':RoutingConfigTests().config()}
                raise RuntimeError('AccessDenied')
            with patch.object(edge,'aws',side_effect=fake) as mocked:
                with self.assertRaises(RuntimeError):edge.run('prepare','D',root/'dist',root/'snapshot')
                self.assertFalse(any(call.args[1]=='update-distribution' for call in mocked.call_args_list))

if __name__=='__main__':unittest.main()
