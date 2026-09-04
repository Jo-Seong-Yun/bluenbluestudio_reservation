-- 관리자의 예약 완전 삭제.
--
-- "취소"(cancel_reservation)는 status만 cancelled로 바꿔서 손님이
-- 예약 조회에서 계속 볼 수 있게 남겨둔다. 이 정책은 그것과 다르다 —
-- 행 자체를 지운다. 지우면 lookup_reservations_by_phone()도 그
-- 예약을 더는 찾지 못하므로, 관리자 화면·손님 화면 양쪽에서 동시에
-- 사라진다.
--
-- 관리자(authenticated)만 지울 수 있다. anon(손님)에게는 주지 않는다 —
-- 손님이 스스로 할 수 있는 건 취소까지고, 완전 삭제는 사장님만 한다.

create policy "관리자 예약 삭제"
  on reservations for delete
  to authenticated
  using (true);
