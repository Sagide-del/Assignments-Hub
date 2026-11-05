import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'../services/math-engine');const destination=join(root,'dist/math-engine');mkdirSync(destination,{recursive:true});
for(const file of ['main.py','solver.py','requirements.txt'])cpSync(join(source,file),join(destination,file));
if(!process.env.MATH_ENGINE_URL){
 const env=join(root,'.math-venv');const python=process.env.MATH_ENGINE_PYTHON||join(env,'bin/python');
 if(!existsSync(python))execFileSync('python3',['-m','venv',env],{stdio:'inherit',timeout:120000});
 execFileSync(python,['-m','pip','install','--no-cache-dir','-r',join(source,'requirements.txt')],{stdio:'inherit',timeout:240000});
 execFileSync(python,['-c','import fastapi,uvicorn,sympy'],{stdio:'inherit',timeout:30000});
}
console.log('Bounded Python math engine prepared.');
