-- Append-only history. No foreign keys: deleting a target must never delete history.
begin;
create schema if not exists audit_private;
revoke all on schema audit_private from public, anon, authenticated;
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 occurred_at timestamptz not null default clock_timestamp(),
 recorded_at timestamptz not null default clock_timestamp(),
 actor_type text not null check(actor_type in ('customer','admin','system','unknown')),
 actor_id uuid,
 source_table text not null,
 source_id text,
 operation text not null,
 event_kind text,
 session_id uuid, attempt_id uuid, product_id uuid,
 ref text, device text,
 before_data jsonb, after_data jsonb,
 details jsonb not null default '{}'::jsonb,
 import_key text unique
);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated, service_role;
grant select on public.audit_logs to authenticated;
grant select,insert on public.audit_logs to service_role;
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated using ((select auth.uid()) is not null);
create index if not exists audit_logs_time_id on public.audit_logs(occurred_at desc,id desc);
create index if not exists audit_logs_actor_time on public.audit_logs(actor_type,occurred_at desc,id desc);
create index if not exists audit_logs_source_time on public.audit_logs(source_table,source_id,occurred_at desc,id desc);
create index if not exists audit_logs_session_time on public.audit_logs(session_id,occurred_at desc,id desc);
create index if not exists audit_logs_ref_time on public.audit_logs(ref,occurred_at desc,id desc);

-- Explicit value allowlist: no answers, contact details, messages, memo or credentials.
create or replace function audit_private.snapshot(row_data jsonb) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(row_data)
 where key=any(array['id','product_id','reservation_id','field_id','code','slug','type','status',
 'booking_origin','ref','price','sale_price','duration_min','estimated_amount','charged_amount','cost',
 'is_published','active','required','sort_order','shoot_start','shoot_end','date','start_time','end_time',
 'channel','purpose','success','field_label','weekday','open_time','close_time','is_closed','deposit_required','analytics_reset_at','event_kind',
 'session_id','attempt_id','device','form_version','field_order','duration_ms','error_code','occurred_at','created_at']);
$$;
revoke all on function audit_private.snapshot(jsonb) from public,anon,authenticated;

-- Server-generated event details only. Never copy unrestricted jsonb from a source row.
create or replace function audit_private.event_details(row_data jsonb) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
 from jsonb_each(coalesce(row_data->'event_details','{}'::jsonb))
 where key=any(array['month','pageId','fromPage','toPage','optionIndex','selectedCount','date','time','visibility']);
$$;
revoke all on function audit_private.event_details(jsonb) from public,anon,authenticated;

create or replace function audit_private.capture() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare
 old_row jsonb := case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) else '{}'::jsonb end;
 new_row jsonb := case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) else '{}'::jsonb end;
 row_data jsonb; changed jsonb; actor text; row_key text;
begin
 row_data := case when TG_OP='DELETE' then old_row else new_row end;
 if TG_OP='UPDATE' and old_row=new_row then return NEW; end if;
 select coalesce(jsonb_agg(k order by k),'[]'::jsonb) into changed
 from (select key k from jsonb_object_keys(old_row || new_row) as key
       where old_row->key is distinct from new_row->key and key not in ('updated_at','analytics_last_seen_at')) keys;
 if TG_OP='UPDATE' and changed='[]'::jsonb then return NEW; end if;
 actor := case when auth.uid() is not null then 'admin'
   when coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')='anon' then 'customer'
   when TG_TABLE_NAME in ('booking_events','booking_list_views','product_views','apply_views') and TG_OP='INSERT' then 'customer'
   when TG_TABLE_NAME='reservations' and TG_OP='INSERT' and row_data->>'booking_origin'='customer' then 'customer'
   else 'system' end;
 -- Tables without a surrogate id receive a stable non-personal key when possible.
 row_key := coalesce(row_data->>'id',row_data->>'weekday',row_data->>'date');
 insert into public.audit_logs(actor_type,actor_id,source_table,source_id,operation,event_kind,
   occurred_at,session_id,attempt_id,product_id,ref,device,before_data,after_data,details)
 values(actor,auth.uid(),TG_TABLE_NAME,row_key,lower(TG_OP),row_data->>'event_kind',
   case when TG_OP='INSERT' and TG_TABLE_NAME in ('booking_events','booking_list_views','product_views','apply_views')
     then coalesce((row_data->>'occurred_at')::timestamptz,(row_data->>'viewed_at')::timestamptz,clock_timestamp())
     else clock_timestamp() end,
   (row_data->>'session_id')::uuid,(row_data->>'attempt_id')::uuid,
   case when TG_TABLE_NAME='products' then (row_data->>'id')::uuid else (row_data->>'product_id')::uuid end,
   row_data->>'ref',row_data->>'device',
   case when TG_OP in ('UPDATE','DELETE') then audit_private.snapshot(old_row) end,
   case when TG_OP in ('INSERT','UPDATE') then audit_private.snapshot(new_row) end,
   jsonb_build_object('changedFields',changed,'event',audit_private.event_details(row_data)));
 if TG_OP='DELETE' then return OLD; else return NEW; end if;
end; $$;
revoke all on function audit_private.capture() from public,anon,authenticated;

-- Lock and backfill in the same transaction, so concurrent writes cannot fall in a gap.
do $$ declare t text; import_needed boolean := not exists(select 1 from public.audit_logs where import_key='audit-backfill-v1'); begin
 foreach t in array array['products','weekly_hours','date_overrides','blocks','reservations','settings',
 'notification_logs','monthly_expenses','custom_fields','reservation_answers','reservation_candidates',
 'customers','product_views','booking_list_views','record_sheet_template','apply_views','email_rules','booking_events'] loop
   if to_regclass('public.'||t) is null then continue; end if;
   execute format('lock table public.%I in share row exclusive mode',t);
   execute format('drop trigger if exists preserve_audit_history on public.%I',t);
   execute format('create trigger preserve_audit_history after insert or update or delete on public.%I for each row execute function audit_private.capture()',t);
   if import_needed then
   execute format($q$
     insert into public.audit_logs(actor_type,source_table,source_id,operation,event_kind,occurred_at,
       session_id,attempt_id,product_id,ref,device,after_data,details,import_key)
     select 'unknown',%L,j->>'id','snapshot',j->>'event_kind',
       coalesce((j->>'occurred_at')::timestamptz,(j->>'viewed_at')::timestamptz,(j->>'created_at')::timestamptz,clock_timestamp()),
       (j->>'session_id')::uuid,(j->>'attempt_id')::uuid,
       case when %L='products' then (j->>'id')::uuid else (j->>'product_id')::uuid end,
       j->>'ref',j->>'device',audit_private.snapshot(j),jsonb_build_object('imported',true,'event',audit_private.event_details(j)),
       %L||':'||coalesce(j->>'id',j->>'weekday',j->>'date','singleton')
     from (select to_jsonb(r) j from public.%I r) rows
     on conflict(import_key) do nothing
   $q$,t,t,t,t);
   end if;
 end loop;
 insert into public.audit_logs(actor_type,source_table,operation,details,import_key)
 values('system','audit_migration','snapshot','{"version":1}'::jsonb,'audit-backfill-v1')
 on conflict(import_key) do nothing;
end $$;

create or replace function audit_private.reject_mutation() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin raise exception '보존 이력은 수정하거나 삭제할 수 없습니다.'; end; $$;
revoke all on function audit_private.reject_mutation() from public,anon,authenticated;
drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function audit_private.reject_mutation();
drop trigger if exists audit_logs_no_truncate on public.audit_logs;
create trigger audit_logs_no_truncate before truncate on public.audit_logs for each statement execute function audit_private.reject_mutation();
commit;
