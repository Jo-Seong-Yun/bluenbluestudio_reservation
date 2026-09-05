-- 관리자의 수기 예약 등록(Phase 7)을 위한 정책.
--
-- 기존 "관리자도 예약 등록" 정책(20260904000100)은 손님용 예약 폼을
-- 관리자 계정으로도 쓸 수 있게 한 것이라 status='requested'로만 넣을
-- 수 있었다. 전화·DM으로 받은 예약은 이미 통화로 확인된 것이라 접수
-- 대기(requested)가 아니라 바로 확정(confirmed)으로 넣는 게 맞으므로,
-- 그 상태에 대해서만 별도로 허용한다. 두 정책은 OR로 결합되므로 기존
-- 동작(requested로 넣기)은 그대로 유지된다.
create policy "관리자 수기 예약 등록"
  on reservations for insert
  to authenticated
  with check (status = 'confirmed');
