import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const patch=process.env.COMPANION_PATCH||'';
if(!patch.startsWith('diff --git ')||patch.length>200000||patch.includes('GIT binary patch'))throw new Error('Worker did not produce a reviewable text patch');
const patchFile=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'companion-patch-')),'repair.patch');
fs.writeFileSync(patchFile,patch);
execFileSync('git',['apply','--check',patchFile]);
execFileSync('git',['apply',patchFile]);
const changed=[...new Set([...execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n'),...execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n')].filter(Boolean))];
// Existing tests, security settings, credentials, workflows and other app code are immutable to the worker.
const production=/^extension-insurer\/(background|bridge|portalJourney|interfaceMonitor)\.js$/;
const newTest=/^extension-insurer\/repair-[a-f0-9]{8,64}\.node\.test\.cjs$/;
if(!changed.length||changed.some(path=>!production.test(path)&&!newTest.test(path)))throw new Error('Patch changed a file outside the repair scope');
if(changed.some(path=>!fs.existsSync(path)||fs.lstatSync(path).isSymbolicLink()))throw new Error('Repair cannot delete files or create symlinks');
if(!changed.some(path=>newTest.test(path)))throw new Error('Repair must add an isolated regression test');
for(const path of changed.filter(p=>newTest.test(p))){try{execFileSync('git',['cat-file','-e',`HEAD:${path}`],{stdio:'ignore'});throw new Error('Repair cannot replace an existing test');}catch(e){if(e.message==='Repair cannot replace an existing test')throw e;}}
execFileSync('git',['add','--intent-to-add',...changed]);
execFileSync('git',['diff','--check']);
console.log('Repair patch is within the permitted scope');
