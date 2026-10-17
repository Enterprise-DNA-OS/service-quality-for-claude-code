import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {transaction} from './domain.mjs';
const text=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(label+' must be a nonempty string');return v.trim();};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export async function importZendesk(db,file,{workspace,actor='import preview',dry=false}={}){
 text(workspace,'workspace');const payload=JSON.parse(readFileSync(file,'utf8'));
 const pages=Array.isArray(payload)?payload:[payload];const incoming=[];const seen=new Set();
 if(!pages.length)throw Error('Export contains no pages');
 const paged=pages.filter(p=>p?.pagination);
 if(paged.length){
  if(paged.length!==pages.length)throw Error('Every export page must carry pagination metadata');
  const {total,pageSize}=paged[0].pagination;
  if(!Number.isInteger(total)||total<0||!Number.isInteger(pageSize)||pageSize<1)throw Error('Invalid pagination total or pageSize');
  const numbers=paged.map(p=>p.pagination.page).sort((a,b)=>a-b);
  if(paged.some(p=>p.pagination.total!==total||p.pagination.pageSize!==pageSize))throw Error('Export pages disagree on pagination');
  if(![0,1].includes(numbers[0])||numbers.some((n,i)=>!Number.isInteger(n)||n!==numbers[0]+i)||pages.length!==Math.max(1,Math.ceil(total/pageSize)))throw Error('Incomplete or duplicated export pages; collect all pages first');
 }

 for(const page of pages){
 if(!page||!Array.isArray(page.conversations))throw Error('Expected Zendesk export object with conversations array, or an array of those pages');
 for(const c of page.conversations){
 const key=text(c.externalId,'conversation externalId');if(!Array.isArray(c.reviews))throw Error('Missing reviews array for '+key);
 for(const r of c.reviews){
 const id=text(r.id,'review id');const source_id=workspace+':'+String(c.workspaceId||'workspace')+':'+id;if(seen.has(source_id))throw Error('Duplicate review '+source_id);seen.add(source_id);
 if(!r.reviewer||!r.reviewee)throw Error('Reviewer and reviewee required');
 const reviewer=text(r.reviewer.email||r.reviewer.name,'reviewer'),reviewee=text(r.reviewee.email||r.reviewee.name,'reviewee');
 if(r.score!==null&&r.score!==undefined&&(typeof r.score!=='number'||!Number.isFinite(r.score)))throw Error('Vendor score must be numeric or null');
 if(!Array.isArray(r.ratings))throw Error('Ratings array required');
 if(!/^\d{4}-\d{2}-\d{2}T/.test(r.created||'')||!Number.isFinite(Date.parse(r.created)))throw Error('Source created must be an ISO timestamp');
 // Preserve source fields intact, including native rating scales, comments, tags and scorecard.
 // No assumption about Zendesk score units or critical-failure semantics enters local scoring.
 const raw={conversation:{...c,reviews:undefined},review:r};delete raw.conversation.reviews;
 incoming.push({source_id,workspace,conversation_key:key,reviewer,reviewee,vendor_score:r.score??null,source_created:new Date(r.created).toISOString(),raw});
 }
 }
 }
 return transaction(db,async()=>{
 let inserted=0,unchanged=0;
 for(const row of incoming){const old=await db.query('select raw from imported_reviews where source_id=$1',[row.source_id]);
 if(old.length){if(hash(old[0].raw)!==hash(row.raw))throw Error('Changed historical review '+row.source_id+'; reconcile a new export workspace label instead of overwriting evidence');unchanged++;continue;}
 const keys=Object.keys(row);await db.query(`insert into imported_reviews (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>k==='raw'?JSON.stringify(row[k]):row[k]));inserted++;
 }
 return {dry_run:dry,workspace,source_reviews:incoming.length,inserted,unchanged,source_conversations:pages.reduce((n,p)=>n+p.conversations.length,0),note:'Imported archive only. Native scores remain separate from local production performance. Export pagination and permissions determine completeness.'};
 },{actor,dry});
}
