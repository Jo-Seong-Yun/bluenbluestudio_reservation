-- 기존 조회 기록을 보존하며 새 이벤트만 별도 저장합니다. 재실행해도 초기화하지 않습니다.
begin;
alter table public.settings add column if not exists analytics_v2_started_at timestamptz;
alter table public.reservations add column if not exists booking_origin text not null default 'legacy';
create table if not exists public.booking_events (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null, attempt_id uuid, product_id uuid references public.products(id) on delete set null,
 reservation_id uuid references public.reservations(id) on delete cascade,
 event_kind text not null check(event_kind in ('list_view','detail_view','times_view','form_view','review_view','completed','field_view','field_valid','field_invalid','field_error','submit_attempt','submit_error')),
 ref text check(char_length(ref)<=50), device text not null check(device in ('mobile','desktop')),
 form_version text, field_id uuid, field_label text, field_order integer,
 duration_ms integer check(duration_ms between 0 and 86400000),
 error_code text check(error_code in ('validation','availability','server')),
 memo text, occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create unique index if not exists booking_events_completion_unique on public.booking_events(reservation_id) where event_kind='completed';
create index if not exists booking_events_time_index on public.booking_events(occurred_at);
create index if not exists booking_events_attempt_index on public.booking_events(attempt_id);
alter table public.booking_events enable row level security;
drop policy if exists booking_events_admin_read on public.booking_events;
create policy booking_events_admin_read on public.booking_events for select to authenticated using(true);
drop policy if exists booking_events_admin_update on public.booking_events;
create policy booking_events_admin_update on public.booking_events for update to authenticated using(true) with check(true);
drop policy if exists booking_events_admin_delete on public.booking_events;
create policy booking_events_admin_delete on public.booking_events for delete to authenticated using(true);
-- 브라우저에서 접수 성공을 위조해 넣을 수 없도록 insert는 서버 관리용 클라이언트만 사용합니다.
revoke all on public.booking_events from anon,authenticated;
grant select,update,delete on public.booking_events to authenticated;
grant all on public.booking_events to service_role;

create or replace function public.mark_booking_analytics_started() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 update public.settings set analytics_v2_started_at=coalesce(analytics_v2_started_at,new.created_at) where id=1 and analytics_v2_started_at is null;
 return new;
end; $$;
revoke all on function public.mark_booking_analytics_started() from public;
drop trigger if exists booking_analytics_started on public.booking_events;
create trigger booking_analytics_started after insert on public.booking_events for each row execute function public.mark_booking_analytics_started();

-- 예약과 접수 이벤트를 같은 트랜잭션에 저장합니다. 기존 RPC는 구버전 탭을 위해 유지합니다.
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
 ref=left(nullif(trim(p_ref),''),50),estimated_amount=p_estimated_amount where id=v_row.id returning * into v_row;
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
