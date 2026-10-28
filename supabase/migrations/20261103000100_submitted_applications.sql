begin;
alter table public.reservations add column if not exists submission_state text not null default 'legacy' check(submission_state in ('legacy','pending','complete','partial','failed'));
alter table public.reservations add column if not exists submission_error_codes text[] not null default '{}';
-- Deliberately no FK: the submitted original survives deletion of mutable business records.
create table if not exists public.reservation_submissions (
 reservation_id uuid primary key,
 content jsonb not null check(jsonb_typeof(content)='object'),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.reservation_submissions enable row level security;
revoke all on public.reservation_submissions from public,anon,authenticated,service_role;
grant select on public.reservation_submissions to authenticated;
grant select,insert on public.reservation_submissions to service_role;
drop policy if exists submission_admin_read on public.reservation_submissions;
create policy submission_admin_read on public.reservation_submissions for select to authenticated using ((select auth.uid()) is not null);
drop trigger if exists preserve_audit_history on public.reservation_submissions;
create trigger preserve_audit_history after insert on public.reservation_submissions for each row execute function audit_private.capture();
drop trigger if exists submitted_original_immutable on public.reservation_submissions;
create trigger submitted_original_immutable before update or delete on public.reservation_submissions for each row execute function audit_private.reject_mutation();
drop trigger if exists submitted_original_no_truncate on public.reservation_submissions;
create trigger submitted_original_no_truncate before truncate on public.reservation_submissions for each statement execute function audit_private.reject_mutation();

create or replace function public.create_reservation_with_analytics(
 p_code text, p_product_id uuid, p_customer_name text, p_customer_phone text,
 p_customer_email text, p_gender text, p_birth_date date,
 p_candidate_starts timestamptz[], p_candidate_ends timestamptz[],
 p_session_id uuid, p_attempt_id uuid, p_ref text, p_device text, p_form_version text,
 p_estimated_amount integer
) returns public.reservations language plpgsql security definer set search_path=public as $$
declare v_row public.reservations;
begin
 select * into v_row from public.create_reservation_with_candidates(
 p_code,p_product_id,p_customer_name,p_customer_phone,p_customer_email,p_gender,p_birth_date,p_candidate_starts,p_candidate_ends);
 update public.reservations set booking_origin=case when auth.uid() is null then 'customer' else 'admin' end,
 ref=left(nullif(trim(p_ref),''),50),estimated_amount=p_estimated_amount,submission_state='pending' where id=v_row.id returning * into v_row;
 if auth.uid() is null then
 insert into public.booking_events(session_id,attempt_id,product_id,reservation_id,event_kind,ref,device,form_version)
 values(coalesce(p_session_id,gen_random_uuid()),coalesce(p_attempt_id,gen_random_uuid()),p_product_id,v_row.id,'completed',v_row.ref,
 case when p_device='mobile' then 'mobile' else 'desktop' end,case when p_form_version ~ '^[a-f0-9]{8}$' then p_form_version else null end);
 end if;
 return v_row;
end;
$$;
revoke all on function public.create_reservation_with_analytics(text,uuid,text,text,text,text,date,timestamptz[],timestamptz[],uuid,uuid,text,text,text,integer) from public;
grant execute on function public.create_reservation_with_analytics(text,uuid,text,text,text,text,date,timestamptz[],timestamptz[],uuid,uuid,text,text,text,integer) to anon,authenticated;
commit;
