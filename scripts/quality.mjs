#!/usr/bin/env node
import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {getDb} from './lib/db.mjs';import {table} from './lib/format.mjs';
import {reads,entities,runRead,resolve,insert,transaction,finalise,closeCoaching,decideAppeal,details,exportData,writeArtifact} from './lib/domain.mjs';
import {importZendesk} from './lib/import.mjs';
const args=process.argv.slice(2),flags={},pos=[];
for(const a of args){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in flags){console.error('Duplicate flag '+k);process.exit(1);}flags[k]=i<0?true:a.slice(i+1);}else pos.push(a);}
const [cmd,...rest]=pos;
export function format(value,title=''){
 if(Array.isArray(value)){
 if(value.length&&value[0].question)return value.map(x=>format(x.rows,x.question)).join('\n');
 const rows=value.map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,v&&typeof v==='object'?JSON.stringify(v):v])));
 return (title?title+'\n':'')+table(rows,rows.length?Object.keys(rows[0]).map(k=>({key:k,label:k.replaceAll('_',' '),width:65})):[]);
 }if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>Array.isArray(v)?format(v,k):`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n');return String(value);
}
const commands=[...Object.keys(reads),'weekly-review','insights','conversation','add','review','rate','finalise-review','close-coaching','resolve-appeal','log','draft-coaching','draft-weekly-review','import','export'];
if(flags.help||!cmd){console.log('Service Quality commands: '+commands.join(', ')+'\nReads support --json. Writes require --actor=Name. See docs/cli.md.');process.exit(0);}
let db;
try{
 const allowed={add:['actor','file'],review:['actor','file'],rate:['actor','file'],'finalise-review':['actor'],'close-coaching':['actor','resolution'],'resolve-appeal':['actor','status','decision','decider'],log:['actor','text'],import:['actor','workspace','dry-run']};
 const opts=new Set(['json',...(allowed[cmd]||[])]);for(const k of Object.keys(flags))if(!opts.has(k))throw Error('Unknown flag --'+k+' for '+cmd);
 for(const k of ['json','dry-run'])if(k in flags&&flags[k]!==true)throw Error('--'+k+' does not take a value');
 for(const [k,v] of Object.entries(flags))if(!['json','dry-run'].includes(k)&&(typeof v!=='string'||!v.trim()))throw Error('--'+k+' requires a value');
 const write=Object.hasOwn(allowed,cmd)&&!(cmd==='import'&&flags['dry-run']);if(write&&!flags.actor)throw Error('Writes require --actor=Name');
 const arities={conversation:1,add:1,'finalise-review':1,'close-coaching':1,'resolve-appeal':1,log:1,'draft-coaching':1,import:2};
 if(rest.length!==(arities[cmd]||0))throw Error('Wrong arguments for '+cmd);
 if(!commands.includes(cmd))throw Error('Unknown command '+cmd);
 db=await getDb();let result;
 if(reads[cmd]||['weekly-review','insights'].includes(cmd))result=await runRead(db,cmd);
 else if(cmd==='conversation')result=await details(db,rest[0]);
 else if(['add','review','rate'].includes(cmd)){
 if(!flags.file)throw Error('--file=record.json required');const entity=cmd==='add'?rest[0]:cmd==='review'?'reviews':'ratings';
 result=await transaction(db,()=>insert(db,entity,JSON.parse(readFileSync(flags.file,'utf8'))),{actor:flags.actor});
 }else if(cmd==='finalise-review')result=await transaction(db,()=>finalise(db,rest[0]),{actor:flags.actor});
 else if(cmd==='close-coaching')result=await transaction(db,()=>closeCoaching(db,rest[0],flags.resolution),{actor:flags.actor});
 else if(cmd==='resolve-appeal')result=await transaction(db,()=>decideAppeal(db,rest[0],flags.status,flags.decision,flags.decider),{actor:flags.actor});
 else if(cmd==='log')result=await transaction(db,()=>insert(db,'notes',{conversation_id:rest[0],body:flags.text}),{actor:flags.actor});
 else if(cmd==='import'){if(rest[0]!=='zendesk')throw Error('Supported import: zendesk');result=await importZendesk(db,rest[1],{workspace:flags.workspace,actor:flags.actor,dry:!!flags['dry-run']});}
 else if(cmd==='export'){result={file:writeArtifact('exports','quality-'+randomUUID()+'.json',JSON.stringify(await exportData(db),null,2)+'\n')};}
 else if(cmd==='draft-weekly-review'){result={file:writeArtifact('drafts','weekly-'+randomUUID()+'.md','# Service quality review draft\n\n'+format(await runRead(db,'weekly-review'))+'\n\nPrepared for human review. Nothing sent.\n')};}
 else if(cmd==='draft-coaching'){const h=await resolve(db,'coaching',rest[0]);const r=await resolve(db,'reviews',h.review_id);const c=await resolve(db,'conversations',r.conversation_id);result={file:writeArtifact('drafts','coaching-'+randomUUID()+'.md','# Coaching brief draft\n\n'+format([h])+'\n\n'+format(await details(db,c.id))+'\n\nReview disputed assessments before using this brief. Nothing sent.\n')};}
 console.log(flags.json?JSON.stringify(result,null,2):format(result));
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
