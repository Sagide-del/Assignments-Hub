import {spawn} from 'node:child_process';
const [script,...args]=process.argv.slice(2);
if(!script){console.error('Pass a browser verification script.');process.exit(1);}
const limit=16000;let tail='';
const child=spawn(process.execPath,[script,...args],{stdio:['inherit','pipe','pipe'],env:process.env});
for(const [source,destination] of [[child.stdout,process.stdout],[child.stderr,process.stderr]])source.on('data',chunk=>{const text=chunk.toString();tail=(tail+text).slice(-limit);destination.write(chunk);});
let reported=false;
function fail(message,code){if(reported)return;reported=true;const detail=`${script}\n${message}\n${tail}`.slice(-6500).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');if(process.env.GITHUB_ACTIONS==='true')console.log(`::error title=Browser verification failed::${detail}`);process.exitCode=code;}
child.on('error',error=>fail(error.message,1));
child.on('close',(code,signal)=>{if(code===0)return;if(!reported)fail(signal?`Terminated by ${signal}`:`Exited with status ${code}`,Number.isInteger(code)&&code>0?code:1);});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
