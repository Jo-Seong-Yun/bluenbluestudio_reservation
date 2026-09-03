-- 손님 자가 취소.
--
-- reservations 테이블에는 anon UPDATE 정책이 없다(관리자만 수정 가능).
-- 대신 코드+연락처 일치와 취소 기한을 이 함수 안에서 확인한 뒤에만
-- status를 바꾼다. RLS를 anon에게 직접 열어주는 것보다 안전하다 —
-- "본인 확인"과 "기한 확인"이라는 조건이 앱 코드가 아니라 DB에 있다.

create or replace function cancel_reservation(p_code text, p_phone text)
returns setof reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations;
  v_deadline_hours int;
begin
  select * into v_reservation
  from reservations
  where code = p_code and customer_phone = p_phone
  for update;

  if not found then
    return; -- 코드+연락처가 안 맞음. 빈 결과.
  end if;

  -- 이미 취소/완료/노쇼 처리된 건은 건드리지 않고 현재 상태 그대로 돌려준다.
  -- 앱은 반환된 status를 보고 "취소되지 않았다"는 걸 판단한다.
  if v_reservation.status not in ('requested', 'confirmed') then
    return next v_reservation;
    return;
  end if;

  select cancel_deadline_hours into v_deadline_hours from settings where id = 1;

  -- 촬영 시작 기준으로 기한을 넘겼으면 취소하지 않고 그대로 돌려준다.
  if now() > v_reservation.shoot_start - make_interval(hours => v_deadline_hours) then
    return next v_reservation;
    return;
  end if;

  update reservations
  set status = 'cancelled'
  where id = v_reservation.id
  returning * into v_reservation;

  return next v_reservation;
end;
$$;

revoke all on function cancel_reservation(text, text) from public;
grant execute on function cancel_reservation(text, text) to anon, authenticated;
