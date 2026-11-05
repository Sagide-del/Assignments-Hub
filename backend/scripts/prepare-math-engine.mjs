import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const canonical=resolve(root,'../services/math-engine');
const bundled=join(root,'runtime/math-engine');
// Render may expose only backend/. The committed runtime is self-contained;
// compare with the canonical source whenever the full repository is available.
for(const file of ['main.py','solver.py','requirements.txt']){
 const local=readFileSync(join(bundled,file));
 if(existsSync(join(canonical,file))&&!local.equals(readFileSync(join(canonical,file))))throw Error(`Math runtime source drift: ${file}. Synchronise backend/runtime/math-engine with services/math-engine.`);
}
if(!process.env.MATH_ENGINE_URL){
 const env=join(root,'.math-venv');const python=process.env.MATH_ENGINE_PYTHON||join(env,'bin/python');
 if(!existsSync(python))execFileSync('python3',['-m','venv',env],{stdio:'inherit',timeout:120000});
 execFileSync(python,['-m','pip','install','--no-cache-dir','-r',join(bundled,'requirements.txt')],{stdio:'inherit',timeout:240000});
 execFileSync(python,['runtime_smoke.py'],{cwd:bundled,stdio:'inherit',timeout:30000,env:{...process.env,OPENBLAS_NUM_THREADS:'1',PYTHONDONTWRITEBYTECODE:'1'}});
}
console.log('Self-contained Python math runtime is ready.');
