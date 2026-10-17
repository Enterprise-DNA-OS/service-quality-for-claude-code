create table people (
 id uuid primary key default gen_random_uuid(), source_id text not null unique check (btrim(source_id)<>''),
 name text not null check (btrim(name)<>''), email text not null unique check (position('@' in email)>1),
 team text not null default 'Unassigned', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table conversations (
 id uuid primary key default gen_random_uuid(), source_id text not null unique check (btrim(source_id)<>''),
 name text not null check(btrim(name)<>''), agent_id uuid not null references people,
 channel text not null check(channel in ('email','chat','phone','other')), occurred_on date not null,
 review_due date not null, evidence text not null default '', purpose text not null default '', retention_review_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(review_due>=occurred_on)
);
create table scorecards (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, name text not null,
 version text not null, active boolean not null default true, unique(name,version),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table criteria (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, scorecard_id uuid not null references scorecards,
 name text not null, weight numeric not null check(weight>0 and weight<=100), max_score numeric not null check(max_score>0),
 critical boolean not null default false, allow_na boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(scorecard_id,name)
);
create table reviews (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, conversation_id uuid not null references conversations,
 reviewer_id uuid not null references people, scorecard_id uuid not null references scorecards,
 kind text not null default 'production' check(kind in ('production','calibration')),
 status text not null default 'draft' check(status in ('draft','final')), reviewed_on date not null default current_date,
 evidence text not null check(btrim(evidence)<>''), finalised_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(conversation_id,reviewer_id,scorecard_id,kind), check((status='final')=(finalised_at is not null))
);
create table ratings (
 id uuid primary key default gen_random_uuid(), source_id text not null unique,
 review_id uuid not null references reviews, criterion_id uuid not null references criteria,
 score numeric, not_applicable boolean not null default false, reason text not null check(btrim(reason)<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(review_id,criterion_id), check((not_applicable and score is null) or (not not_applicable and score is not null and score>=0))
);
create table coaching (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, name text not null,
 review_id uuid not null references reviews, owner_id uuid not null references people, due_on date not null,
 status text not null default 'open' check(status in ('open','closed')), resolution text not null default '',
 closed_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='open' and closed_on is null) or (status='closed' and closed_on is not null and btrim(resolution)<>''))
);
create table appeals (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, review_id uuid not null references reviews,
 reason text not null check(btrim(reason)<>''), due_on date not null, status text not null default 'open' check(status in ('open','upheld','rejected')),
 decision text not null default '', decided_by uuid references people, decided_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='open' and decided_on is null and decided_by is null) or (status<>'open' and decided_on is not null and decided_by is not null and btrim(decision)<>''))
);
create unique index one_open_appeal on appeals(review_id) where status='open';
create table notes (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, conversation_id uuid not null references conversations,
 body text not null check(btrim(body)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table imported_reviews (
 id uuid primary key default gen_random_uuid(), source_id text not null unique, workspace text not null,
 conversation_key text not null, reviewer text not null, reviewee text not null, vendor_score numeric,
 source_created timestamptz not null, raw jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_log (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null, action text not null,
 actor text not null, before_row jsonb, after_row jsonb, created_at timestamptz not null default now()
);
create function audit_change() returns trigger language plpgsql as $$
begin
 insert into audit_log(entity,record_id,action,actor,before_row,after_row)
 values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,coalesce(nullif(current_setting('app.actor',true),''),'database operator'),
 case when TG_OP<>'INSERT' then to_jsonb(old) end,case when TG_OP<>'DELETE' then to_jsonb(new) end);
 return coalesce(new,old);
end $$;
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'Historical evidence is immutable'; end $$;
create trigger audit_immutable before update or delete on audit_log for each row execute function immutable_record();
create trigger imported_immutable before update or delete on imported_reviews for each row execute function immutable_record();
create function guard_criteria() returns trigger language plpgsql as $$
declare sid uuid;
begin
 sid=coalesce(old.scorecard_id,new.scorecard_id);
 perform 1 from scorecards where id=sid for update;
 if exists(select 1 from reviews where scorecard_id=sid) or (TG_OP='UPDATE' and exists(select 1 from reviews where scorecard_id=new.scorecard_id)) then
 raise exception 'Used scorecards are locked; create a new version'; end if;
 return coalesce(new,old);
end $$;
create trigger criteria_guard before insert or update or delete on criteria for each row execute function guard_criteria();
create function guard_scorecard() returns trigger language plpgsql as $$
begin
 if exists(select 1 from reviews where scorecard_id=old.id) and (TG_OP='DELETE' or new.name<>old.name or new.version<>old.version or new.source_id<>old.source_id) then
 raise exception 'Used scorecards are locked'; end if; return coalesce(new,old);
end $$;
create trigger scorecard_guard before update or delete on scorecards for each row execute function guard_scorecard();
create function guard_review() returns trigger language plpgsql as $$
declare c conversations%rowtype; total integer; rated integer; applicable integer;
begin
 if TG_OP<>'INSERT' and old.status='final' then raise exception 'Final review is immutable'; end if;
 if TG_OP='DELETE' then return old; end if;
 select * into c from conversations where id=new.conversation_id for update;
 if c.agent_id=new.reviewer_id then raise exception 'Independent reviewer required'; end if;
 if new.reviewed_on<c.occurred_on or new.reviewed_on>current_date then raise exception 'Review date is outside conversation period'; end if;
 perform 1 from scorecards where id=new.scorecard_id and active for update;
 if not found then raise exception 'Active scorecard required'; end if;
 if not exists(select 1 from people where id=new.reviewer_id and active) then raise exception 'Active reviewer required'; end if;
 if TG_OP='UPDATE' and (new.scorecard_id<>old.scorecard_id or new.conversation_id<>old.conversation_id or new.reviewer_id<>old.reviewer_id) then raise exception 'Review identity is locked'; end if;
 if new.status='final' then
  select count(*) into total from criteria where scorecard_id=new.scorecard_id;
  select count(*),count(*) filter(where not not_applicable) into rated,applicable from ratings where review_id=new.id;
  if total=0 or total<>rated or applicable=0 then raise exception 'Every criterion and at least one applicable rating required'; end if;
 end if;
 return new;
end $$;
create trigger review_guard before insert or update or delete on reviews for each row execute function guard_review();
create function guard_rating() returns trigger language plpgsql as $$
declare r reviews%rowtype; c criteria%rowtype;
begin
 select * into r from reviews where id=coalesce(old.review_id,new.review_id) for update;
 if r.status='final' then raise exception 'Final rating is immutable'; end if;
 if TG_OP='DELETE' then return old; end if;
 if TG_OP='UPDATE' and new.review_id<>old.review_id then raise exception 'Rating identity is locked'; end if;
 select * into c from criteria where id=new.criterion_id;
 if c.scorecard_id<>r.scorecard_id then raise exception 'Criterion belongs to another scorecard'; end if;
 if new.not_applicable and not c.allow_na then raise exception 'N/A is not allowed'; end if;
 if new.score>c.max_score then raise exception 'Rating exceeds maximum'; end if;
 return new;
end $$;
create trigger rating_guard before insert or update or delete on ratings for each row execute function guard_rating();
create function guard_followup() returns trigger language plpgsql as $$
declare reviewer uuid; agent uuid; final_status text;
begin
 select r.reviewer_id,c.agent_id,r.status into reviewer,agent,final_status from reviews r join conversations c on c.id=r.conversation_id where r.id=new.review_id;
 if final_status<>'final' then raise exception 'Final review required for follow-up'; end if;
 if TG_OP='UPDATE' then
  if old.status<>'open' then raise exception 'Closed follow-up is immutable'; end if;
  if old.review_id<>new.review_id then raise exception 'Follow-up review is locked'; end if;
 end if;
 if TG_TABLE_NAME='appeals' then
  if new.status<>'open' and (new.decided_by=reviewer or new.decided_by=agent) then raise exception 'Independent appeal decision required'; end if;
  if new.decided_on>current_date then raise exception 'Future decision is invalid'; end if;
 else
  if new.closed_on>current_date then raise exception 'Future closure is invalid'; end if;
 end if;
 return new;
end $$;
create trigger appeal_guard before insert or update on appeals for each row execute function guard_followup();
create trigger coaching_guard before insert or update on coaching for each row execute function guard_followup();
do $$ declare t text; begin
 foreach t in array array['people','conversations','scorecards','criteria','reviews','ratings','coaching','appeals','notes','imported_reviews'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('create trigger audit after insert or update or delete on %I for each row execute function audit_change()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
alter table audit_log enable row level security;
revoke all on audit_log from public;
create view v_scores with (security_invoker=true) as
select r.id,r.source_id,c.source_id conversation,p.name agent,p.team,u.name reviewer,s.name scorecard,s.version,r.kind,r.status,r.reviewed_on,
 case when bool_or(k.critical and not a.not_applicable and a.score=0) then 0::numeric
 else round(100*sum(a.score/k.max_score*k.weight) filter(where not a.not_applicable)/nullif(sum(k.weight) filter(where not a.not_applicable),0),2) end score,
 coalesce(bool_or(k.critical and not a.not_applicable and a.score=0),false) critical_failure,
 exists(select 1 from appeals ap where ap.review_id=r.id and ap.status='open') under_appeal,
 exists(select 1 from appeals ap where ap.review_id=r.id and ap.status='upheld') withdrawn
from reviews r join conversations c on c.id=r.conversation_id join people p on p.id=c.agent_id
join people u on u.id=r.reviewer_id join scorecards s on s.id=r.scorecard_id
left join ratings a on a.review_id=r.id left join criteria k on k.id=a.criterion_id
group by r.id,c.id,p.id,u.id,s.id;
create view v_review_queue with (security_invoker=true) as
select c.id,c.source_id,c.name,p.name agent,p.team,c.channel,c.review_due,current_date-c.review_due days_overdue
from conversations c join people p on p.id=c.agent_id
where not exists(select 1 from v_scores s where s.conversation=c.source_id and s.kind='production' and s.status='final' and not s.withdrawn);
create view v_coaching_due with (security_invoker=true) as
select h.id,h.source_id,h.name,s.agent,p.name owner,h.due_on,current_date-h.due_on days_overdue,s.score,s.critical_failure
from coaching h join v_scores s on s.id=h.review_id join people p on p.id=h.owner_id where h.status='open';
create view v_calibration with (security_invoker=true) as
select conversation,scorecard,version,count(*) reviewers,min(score) low_score,max(score) high_score,max(score)-min(score) spread
from v_scores where kind='calibration' and status='final' and not withdrawn group by conversation,scorecard,version;
create view v_compliance with (security_invoker=true) as
select 'PRIVACY-PURPOSE' rule,c.source_id record,'Record the purpose before using this conversation' finding from conversations c where btrim(purpose)=''
union all select 'PRIVACY-RETENTION',source_id,'Review retention purpose and disposal decision' from conversations where retention_review_on is null or retention_review_on<=current_date
union all select 'REVIEW-EVIDENCE',source_id,'Locate source evidence before reviewing' from conversations where btrim(evidence)=''
union all select 'ACCURACY-APPEAL',source_id,'Resolve disputed assessment before relying on it' from appeals where status='open'
union all select 'CRITICAL-COACHING',s.source_id,'Critical failure has no open coaching action' from v_scores s where s.status='final' and s.kind='production' and s.critical_failure and not s.withdrawn and not exists(select 1 from coaching h where h.review_id=s.id and h.status='open');
create function guard_conversation() returns trigger language plpgsql as $$
begin
 if exists(select 1 from reviews where conversation_id=old.id) and
 (TG_OP='DELETE' or new.agent_id<>old.agent_id or new.occurred_on<>old.occurred_on or new.source_id<>old.source_id or new.evidence<>old.evidence) then
 raise exception 'Reviewed conversation identity and evidence are locked'; end if;
 return coalesce(new,old);
end $$;
create trigger conversation_guard before update or delete on conversations for each row execute function guard_conversation();
