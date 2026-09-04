-- 주간 캘린더 한 칸(1시간) 토글을 위한 RPC.
--
-- 기존에는 Next.js 서버 액션이 "정확히 겹치는 차단이 있는지 select로 확인 →
-- 있으면 delete, 없으면 insert" 두 단계를 순서대로 호출했다. 클릭 한 번마다
-- Vercel↔Supabase 왕복이 두 번 생기는 셈이라, 그만큼 반응이 늦게 느껴졌다.
-- 이 두 단계를 DB 함수 하나로 묶어 왕복을 한 번으로 줄인다.
--
-- authenticated role은 이미 blocks 테이블에 대해 RLS로 전체 권한이 있으므로
-- (schedule.sql의 "관리자만 접근" 정책), SECURITY DEFINER 없이 일반 함수로
-- 충분하다 — 호출한 사용자 자신의 권한으로 실행된다.
create or replace function toggle_block_hour(p_start timestamptz, p_end timestamptz)
returns boolean -- true = 방금 차단됨, false = 방금 해제됨
language plpgsql
as $$
declare
  v_period tstzrange := tstzrange(p_start, p_end, '[)');
  v_deleted int;
begin
  delete from blocks where period = v_period;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    return false;
  end if;

  insert into blocks (period) values (v_period);
  return true;
end;
$$;

revoke all on function toggle_block_hour(timestamptz, timestamptz) from public;
grant execute on function toggle_block_hour(timestamptz, timestamptz) to authenticated;
