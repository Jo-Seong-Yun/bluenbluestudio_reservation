-- ⚠️ 반드시 20261017000100_reservation_status_split.sql을 먼저 실행한
-- 뒤, 별도로 이 파일을 실행할 것.

-- 이중예약 방지 제약을 새 상태까지 포함하도록 다시 건다 — 일정만
-- 잡히고 입금 전(schedule_confirmed)이어도 그 시간은 다른 손님이
-- 잡지 못해야 한다.
alter table reservations drop constraint reservations_no_overlap;
alter table reservations
  add constraint reservations_no_overlap
  exclude using gist (period with &&)
  where (status in ('requested', 'schedule_confirmed', 'payment_confirmed'));

-- 손님 자가 취소 재정의: 취소 가능한 상태 목록에 새 상태를 반영한다.
-- (함수 본문은 문자열로 저장돼 매번 다시 해석되므로, enum 값 이름이
-- 바뀌면 이 함수도 새 이름으로 다시 정의해야 한다 — 그냥 두면 다음
-- 호출부터 'confirmed'라는 값이 없다는 오류가 난다.)
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
    return;
  end if;

  if v_reservation.status not in ('requested', 'schedule_confirmed', 'payment_confirmed') then
    return next v_reservation;
    return;
  end if;

  if v_reservation.shoot_start is not null then
    select cancel_deadline_hours into v_deadline_hours from settings where id = 1;

    if now() > v_reservation.shoot_start - make_interval(hours => v_deadline_hours) then
      return next v_reservation;
      return;
    end if;
  end if;

  update reservations
  set status = 'cancelled'
  where id = v_reservation.id
  returning * into v_reservation;

  return next v_reservation;
end;
$$;
