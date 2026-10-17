import {writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {REPO_ROOT} from './db.mjs';
export const entities={
 people:['source_id','name','email','team','active'],
 conversations:['source_id','name','agent_id','channel','occurred_on','review_due','evidence','purpose','retention_review_on'],
 scorecards:['source_id','name','version','active'],criteria:['source_id','scorecard_id','name','weight','max_score','critical','allow_na'],
 reviews:['source_id','conversation_id','reviewer_id','scorecard_id','kind','reviewed_on','evidence'],
 ratings:['source_id','review_id','criterion_id','score','not_applicable','reason'],
 coaching:['source_id','name','review_id','owner_id','due_on'],appeals:['source_id','review_id','reason','due_on'],notes:['source_id','conversation_id','body']
};
const refs={agent_id:'people',reviewer_id:'people',owner_id:'people',scorecard_id:'scorecards',conversation_id:'conversations',review_id:'reviews',criterion_id:'criteria'};
export async function transaction(db,fn,{actor='operator',dry=false}={}){await db.exec('begin');try{await db.query("select set_config('app.actor',$1,true)",[actor]);const result=await fn();await db.exec(dry?'rollback':'commit');return result;}catch(e){await db.exec('rollback');throw e;}}
export function normalise(entity,input){
 if(!entities[entity])throw Error('Unknown entity: '+entity);
 const out={};for(const [key,value] of Object.entries(input)){
 if(!entities[entity].includes(key))throw Error('Unsupported field '+key);
 let v=value;
 if(['active','critical','allow_na','not_applicable'].includes(key)){if(![true,false,'true','false'].includes(v))throw Error(key+' must be true or false');v=v===true||v==='true';}
 if(['weight','max_score','score'].includes(key)&&v!==null){if(v===''||!Number.isFinite(Number(v)))throw Error(key+' must be numeric');v=Number(v);}
 if(/(?:_on|_due)$/.test(key)&&v!==null){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error(key+' requires a real ISO date');}
 if(typeof v==='string')v=v.trim();if(key==='email')v=v.toLowerCase();out[key]=v;
 }return out;
}
export async function resolve(db,entity,needle){
 if(![...Object.keys(entities),'imported_reviews'].includes(entity))throw Error('Unknown entity');
 if(!String(needle??'').trim())throw Error('Missing '+entity+' reference');
 const named=entities[entity]?.includes('name');
 const list=await db.query(`select * from ${entity} where lower(source_id)=lower($1) or id::text=$1`,[needle]);
 if(list.length===1)return list[0];
 const rows=await db.query(`select * from ${entity} where starts_with(id::text,$1) ${named?'or position(lower($1) in lower(name))>0':''} order by source_id`,[needle]);
 if(rows.length===1)return rows[0];
 throw Error(rows.length?`Ambiguous ${entity}:\n`+rows.map(r=>`${r.source_id} ${r.id} ${r.name||''}`).join('\n'):`No ${entity} matches ${needle}`);
}
export async function insert(db,entity,input){
 const data=normalise(entity,input);data.source_id ||= randomUUID();
 for(const [key,target] of Object.entries(refs))if(data[key])data[key]=(await resolve(db,target,data[key])).id;
 const keys=Object.keys(data);return (await db.query(`insert into ${entity} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,keys.map(k=>data[k])))[0];
}
export const reads={
 criteria:'select k.source_id,s.name scorecard,s.version,k.name,k.weight,k.max_score,k.critical,k.allow_na from criteria k join scorecards s on s.id=k.scorecard_id order by s.name,k.source_id',
 people:'select source_id,name,email,team,active from people order by name',
 conversations:'select c.source_id,c.name,p.name agent,c.channel,c.occurred_on,c.review_due from conversations c join people p on p.id=c.agent_id order by c.review_due',
 scorecards:'select s.source_id,s.name,s.version,s.active,count(k.id) criteria from scorecards s left join criteria k on k.scorecard_id=s.id group by s.id order by s.name',
 'review-queue':'select source_id,name,agent,channel,review_due,days_overdue from v_review_queue order by review_due',
 reviews:"select source_id,conversation,agent,reviewer,kind,status,score,critical_failure,under_appeal,withdrawn from v_scores order by source_id",
 calibration:'select * from v_calibration order by spread desc',
 'coaching-due':'select source_id,name,agent,owner,due_on,days_overdue from v_coaching_due order by due_on',
 appeals:'select a.source_id,s.agent,s.conversation,a.reason,a.due_on,a.status,a.decision from appeals a join v_scores s on s.id=a.review_id order by a.due_on',
 compliance:'select * from v_compliance order by rule,record',
 performance:"select team,agent,count(*) reviews,round(avg(score),2) average_score,count(*) filter(where critical_failure) critical_failures from v_scores where kind='production' and status='final' and not under_appeal and not withdrawn group by team,agent order by team,agent",
 history:'select source_id,workspace,conversation_key,reviewer,reviewee,vendor_score,source_created from imported_reviews order by source_created',
 attention:"select 'Review' item,source_id reference,agent owner,days_overdue from v_review_queue where days_overdue>0 union all select 'Coaching',source_id,owner,days_overdue from v_coaching_due where days_overdue>0 union all select 'Appeal',a.source_id,s.reviewer,current_date-a.due_on from appeals a join v_scores s on s.id=a.review_id where a.status='open' and a.due_on<current_date order by days_overdue desc"
};
export const questions=[
 ['Which overdue conversations have no production review?',reads['review-queue']+' limit 100'],
 ['Which critical failures still have overdue coaching?',"select s.conversation,s.agent,h.name,h.days_overdue from v_scores s join v_coaching_due h on h.id in (select id from coaching where review_id=s.id) where s.critical_failure and h.days_overdue>0"],
 ['Where do reviewers disagree on the same conversation?',reads.calibration],
 ['Which disputed scores are excluded from performance averages?',"select source_id,agent,score from v_scores where under_appeal or withdrawn"],
 ['Which teams have the largest overdue review backlog?',"select team,count(*) overdue from v_review_queue where days_overdue>0 group by team order by overdue desc"],
 ['Which conversation records need a retention decision?',"select source_id,name,retention_review_on from conversations where retention_review_on is null or retention_review_on<=current_date"],
 ['Which source conversations lack purpose or evidence?',"select source_id,name,purpose,evidence from conversations where btrim(purpose)='' or btrim(evidence)=''"],
 ['Which agents have both coaching due and an open appeal?',"select distinct s.agent from v_scores s join coaching h on h.review_id=s.id where h.status='open' and exists(select 1 from appeals a join reviews r on r.id=a.review_id join conversations c on c.id=r.conversation_id where a.status='open' and c.agent_id=(select agent_id from conversations where source_id=s.conversation))"],
 ['Which scorecard versions are driving critical failures?',"select scorecard,version,count(*) failures from v_scores where critical_failure and status='final' and kind='production' and not withdrawn group by scorecard,version"],
 ['Which coaching commitments fall due in the next week?',"select source_id,name,agent,owner,due_on from v_coaching_due where due_on between current_date and current_date+7"]
];
export async function runRead(db,cmd){
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='weekly-review')return {review_queue:await runRead(db,'review-queue'),coaching:await runRead(db,'coaching-due'),appeals:await runRead(db,'appeals'),calibration:await runRead(db,'calibration')};
 if(cmd==='insights'){const out=[];for(const [question,sql] of questions)out.push({question,rows:await db.query(sql)});return out;}
 throw Error('Unknown read command '+cmd);
}
export async function finalise(db,ref){const r=await resolve(db,'reviews',ref);return (await db.query("update reviews set status='final',finalised_at=now() where id=$1 returning *",[r.id]))[0];}
export async function closeCoaching(db,ref,resolution){if(!resolution?.trim())throw Error('Resolution required');const r=await resolve(db,'coaching',ref);return (await db.query("update coaching set status='closed',closed_on=current_date,resolution=$2 where id=$1 returning *",[r.id,resolution]))[0];}
export async function decideAppeal(db,ref,status,decision,decider){if(!['upheld','rejected'].includes(status)||!decision?.trim())throw Error('Decision and upheld or rejected required');const a=await resolve(db,'appeals',ref),p=await resolve(db,'people',decider);if(!p.active)throw Error('Active decision maker required');return (await db.query('update appeals set status=$2,decision=$3,decided_by=$4,decided_on=current_date where id=$1 returning *',[a.id,status,decision,p.id]))[0];}
export async function details(db,ref){const c=await resolve(db,'conversations',ref);return {conversation:c,reviews:await db.query('select * from v_scores where conversation=$1',[c.source_id]),ratings:await db.query('select r.source_id review,k.name criterion,a.score,a.not_applicable,a.reason from ratings a join reviews r on r.id=a.review_id join criteria k on k.id=a.criterion_id where r.conversation_id=$1',[c.id]),notes:await db.query('select body,created_at from notes where conversation_id=$1 order by created_at',[c.id])};}
export async function exportData(db){const out={format:'service-quality-v1'};for(const t of [...Object.keys(entities),'imported_reviews','audit_log'])out[t]=await db.query(`select * from ${t} order by id`);return out;}
export function writeArtifact(folder,name,body){const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,folder);mkdirSync(dir,{recursive:true});const file=path.join(dir,name);writeFileSync(file,body,{flag:'wx'});return file;}
