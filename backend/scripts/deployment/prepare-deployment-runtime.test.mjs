import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDeploymentRuntime } from '../prepare-deployment-runtime.mjs';

test('Render and CI build the existing private runtime instead of deploying a missing interpreter', () => {
  for (const env of [{ RENDER: 'true' }, { CI: 'true' }, { PREPARE_MATH_ENGINE: 'true' }]) {
    const calls = [];
    assert.equal(prepareDeploymentRuntime(env, (...args) => calls.push(args), () => {}), true);
    assert.equal(calls.length, 1);
    assert(calls[0][1][0].endsWith('/prepare-math-engine.mjs'));
    assert.equal(calls[0][2].env, env);
  }
});
test('Railway does not assume Python exists or undo its prior build workaround', () => {
  let called = false;
  assert.equal(prepareDeploymentRuntime({ RAILWAY_ENVIRONMENT_ID: 'fixture', RENDER: 'false' }, () => { called = true; }, () => {}), false);
  assert.equal(called, false);
});
test('external engine configuration uses the existing preparation script and failed preparation blocks the build', () => {
  const env = { MATH_ENGINE_URL: 'https://private-engine.example' };
  let called = false;
  assert.equal(prepareDeploymentRuntime(env, () => { called = true; }, () => {}), true);
  assert.equal(called, true);
  assert.throws(() => prepareDeploymentRuntime({ RENDER: 'true' }, () => { throw Error('runtime missing'); }, () => {}), /runtime missing/);
});
