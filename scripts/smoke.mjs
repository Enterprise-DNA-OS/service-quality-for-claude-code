import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {getDb} from './lib/db.mjs';import {checkDomain} from './check-domain.mjs';import {reads} from './lib/domain.mjs';
const root=path.resolve(import.meta.dirname,'..'),temp=mkdtempSync(path.join(os.tmpdir(),'quality-test-'));
process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
const env={...process.env};let db;
const cli=(script,args=[],ok=true)=>{const r=spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,env,encoding:'utf8'});assert.equal(r.status,ok?0:1,r.stdout+'\n'+r.stderr);return r;};
try{
 db=await getDb();let checks=await checkDomain(db,temp);await db.close();db=null;
 for(const cmd of [...Object.keys(reads),'weekly-review','insights']){JSON.parse(cli('quality.mjs',[cmd,'--json']).stdout);assert.ok(cli('quality.mjs',[cmd]).stdout.trim());}
 console.log('PASS every CLI read in JSON and text');checks++;
 for(const args of [['bad-command'],['people','--oops'],['people','--json=false'],['people','extra'],['add','people','--file=examples/new-person.json'],['conversation','Alex'],['conversation','00000000']])cli('quality.mjs',args,false);
 console.log('PASS CLI errors and missing actor return nonzero');checks++;
 cli('quality.mjs',['add','people','--file=examples/new-person.json','--actor=Test']);
 cli('quality.mjs',['log','C-104','--text=Observed the follow-up','--actor=Test']);
 cli('quality.mjs',['conversation','C-104','--json']);
 const review={source_id:'CLI-R',conversation_id:'C-104',reviewer_id:'P-4',scorecard_id:'SC-1',evidence:'Observed transcript'};
 const file=path.join(temp,'record.json');writeFileSync(file,JSON.stringify(review));cli('quality.mjs',['review','--file='+file,'--actor=Test']);
 for(let i=1;i<=3;i++){writeFileSync(file,JSON.stringify({source_id:'CLI-K'+i,review_id:'CLI-R',criterion_id:'K-'+i,score:2,reason:'Observed evidence for criterion '+i}));cli('quality.mjs',['rate','--file='+file,'--actor=Test']);}
 cli('quality.mjs',['finalise-review','CLI-R','--actor=Test']);
 writeFileSync(file,JSON.stringify({source_id:'CLI-AP',review_id:'CLI-R',reason:'Check source context',due_on:'2027-01-01'}));cli('quality.mjs',['add','appeals','--file='+file,'--actor=Test']);
 cli('quality.mjs',['resolve-appeal','CLI-AP','--status=rejected','--decision=Source context confirmed','--decider=P-5','--actor=Test']);
 cli('quality.mjs',['close-coaching','CO-2','--resolution=Follow-up observed','--actor=Test']);
 console.log('PASS CLI writes cover assessment, rating, finalisation, appeal and coaching');checks++;
 const imported=JSON.parse(cli('quality.mjs',['import','zendesk','examples/zendesk/reviews.json','--workspace=demo','--dry-run','--json']).stdout);assert.equal(imported.unchanged,1);
 cli('quality.mjs',['import','zendesk','examples/zendesk/reviews.json','--workspace=demo','--actor=Test']);checks++;
 const out=JSON.parse(cli('quality.mjs',['export','--json']).stdout);const data=JSON.parse(readFileSync(out.file));assert.ok(data.audit_log.some(x=>x.actor==='Test'));
 for(const [cmd,...args] of [['draft-coaching','CO-1'],['draft-weekly-review']])cli('quality.mjs',[cmd,...args]);
 cli('view.mjs');cli('docs.mjs');assert.equal(readdirSync(path.join(temp,'views')).length,3);assert.equal(readdirSync(path.join(temp,'docs-out/review-pack')).length,5);assert.equal(readdirSync(path.join(temp,'docs-out/coaching-plan')).length,2);assert.equal(readdirSync(path.join(temp,'drafts')).length,2);
 assert.ok(readFileSync(path.join(temp,'views/calibration.html'),'utf8').includes('Calibration never contributes'));
 console.log('PASS export, draft paperwork and three branded reports');checks++;
 console.log(`PASS ${checks} integration groups; every CLI command; ten business questions.`);
}finally{if(db)await db.close();rmSync(temp,{recursive:true,force:true});}
