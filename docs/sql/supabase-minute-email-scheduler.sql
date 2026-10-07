-- Supabase Dashboard에서 pg_cron, pg_net 확장을 활성화한 뒤 실행합니다.
-- Vault에 다음 두 Secret을 먼저 만드세요(비밀값을 SQL/채팅에 붙이지 않습니다).
-- reservation_cron_secret: Vercel의 CRON_SECRET과 정확히 같은 값
-- reservation_site_url: 예약 사이트의 https:// 운영 주소, 마지막 / 없이
begin;
do $$
begin
  if not exists(select 1 from pg_extension where extname='pg_cron')
     or not exists(select 1 from pg_extension where extname='pg_net') then
    raise exception '먼저 pg_cron, pg_net 확장을 활성화해 주세요.';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='reservation_cron_secret' and length(decrypted_secret)>0)
     or not exists(select 1 from vault.decrypted_secrets where name='reservation_site_url' and decrypted_secret ~ '^https://[^/]+(/[^?#]*)?$') then
    raise exception 'Vault의 reservation_cron_secret / reservation_site_url 설정을 확인해 주세요.';
  end if;
end;
$$;

-- 비밀값은 실행 때 Vault에서 읽으며 cron.job 명령문에는 저장하지 않습니다.
create or replace function public.invoke_minute_email_scheduler() returns void
language plpgsql security definer set search_path=public as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into strict v_url from vault.decrypted_secrets where name='reservation_site_url';
  select decrypted_secret into strict v_secret from vault.decrypted_secrets where name='reservation_cron_secret';
  if v_url !~ '^https://[^/]+(/[^?#]*)?$' or length(v_secret)=0 then
    raise exception '예약 발송 스케줄러 설정이 올바르지 않습니다.';
  end if;
  perform net.http_get(
    url := rtrim(v_url,'/') || '/api/cron/scheduled-emails',
    headers := jsonb_build_object('Authorization','Bearer ' || v_secret),
    timeout_milliseconds := 300000
  );
end;
$$;
revoke all on function public.invoke_minute_email_scheduler() from public,anon,authenticated;

-- 같은 이름으로 재실행하면 기존 작업을 갱신하며 중복 등록하지 않습니다.
select cron.schedule(
  'reservation-email-every-minute',
  '* * * * *',
  'select public.invoke_minute_email_scheduler();'
);
commit;
