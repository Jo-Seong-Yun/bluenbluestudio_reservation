begin;
-- 기존 규칙은 한국시간 19:00을 유지하며, 적용 이전의 과거 예약을 소급 발송하지 않습니다.
alter table public.email_rules
  add column if not exists timing_mode text not null default 'calendar' check (timing_mode in ('calendar','hours')),
  add column if not exists send_time text not null default '19:00' check (send_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add column if not exists hour_offset integer check (hour_offset between 1 and 8760),
  add column if not exists scheduling_started_at timestamptz not null default now();
-- 매분 실행이 겹쳐도 같은 예약을 동시에 발송하지 않도록 서버만 잠금을 획득합니다.
create table if not exists public.reminder_cron_lock (
  id integer primary key check(id=1), token uuid, expires_at timestamptz not null default '-infinity'
);
insert into public.reminder_cron_lock(id) values(1) on conflict do nothing;
alter table public.reminder_cron_lock enable row level security;
revoke all on public.reminder_cron_lock from anon, authenticated;
create or replace function public.claim_reminder_cron(p_token uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  update reminder_cron_lock set token=p_token, expires_at=now()+interval '10 minutes'
  where id=1 and expires_at<=now();
  return found;
end; $$;
create or replace function public.release_reminder_cron(p_token uuid) returns void
language sql security definer set search_path=public as $$
  update reminder_cron_lock set token=null, expires_at='-infinity' where id=1 and token=p_token;
$$;
revoke all on function public.claim_reminder_cron(uuid) from public, anon, authenticated;
revoke all on function public.release_reminder_cron(uuid) from public, anon, authenticated;
grant execute on function public.claim_reminder_cron(uuid) to service_role;
grant execute on function public.release_reminder_cron(uuid) to service_role;
commit;
