-- 손님 자가 취소(cancel_reservation RPC)도 관리자 취소와 같은
-- 휴지통/복원 체계에 들어가도록, 취소되기 직전 상태(status_before_
-- cancel)와 취소 사유(cancel_reason)를 같이 남긴다. 안 남기면
-- 복원(restoreCancelledReservation)이 "직전 상태"를 몰라 무조건
-- requested로 되돌리게 되어, 이미 일정확정/입금확인까지 됐던 예약을
-- 복원했을 때 잘못된 상태로 돌아간다.
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
  set
    status = 'cancelled',
    status_before_cancel = v_reservation.status,
    cancel_reason = '손님이 예약 조회 화면에서 직접 취소'
  where id = v_reservation.id
  returning * into v_reservation;

  return next v_reservation;
end;
$$;
