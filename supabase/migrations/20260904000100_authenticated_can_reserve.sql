-- 로그인한 관리자도 예약을 등록할 수 있게 한다.
--
-- 지금까지는 anon(비로그인 손님)만 예약 신청(INSERT)이 가능했다.
-- 그런데 사장님이 전화로 받은 예약을 대신 /booking 화면에서 입력하거나,
-- 관리자 계정으로 로그인한 채 화면을 테스트할 때도 같은 폼을 쓰게 되므로
-- authenticated 에게도 같은 조건으로 열어준다.

create policy "관리자도 예약 등록"
  on reservations for insert
  to authenticated
  with check (status = 'requested');
