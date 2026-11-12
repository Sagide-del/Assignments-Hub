import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function prepareDeploymentRuntime(env = process.env, execute = execFileSync, log = console.log) {
  // Render's native Node environment and CI previously prepared this runtime.
  // Keep the Railway-specific build workaround: do not assume its Node image
  // has Python. Railway can use an external engine or explicitly opt in.
  const railway = Boolean(env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID);
  const required = env.RENDER === 'true' || (env.CI === 'true' && !railway) || env.PREPARE_MATH_ENGINE === 'true' || Boolean(env.MATH_ENGINE_URL);
  if (!required) {
    log('Local Python runtime preparation skipped on this host. Set PREPARE_MATH_ENGINE=true when Python is installed, or configure an authenticated external math engine.');
    return false;
  }
  execute(process.execPath, [fileURLToPath(new URL('./prepare-math-engine.mjs', import.meta.url))], { stdio: 'inherit', env });
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prepareDeploymentRuntime();
