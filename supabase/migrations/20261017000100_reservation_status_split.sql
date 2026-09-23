-- 예약 상태 "확정" 한 단계를 "일정확정"(시간만 잡힘, 입금 전)과
-- "입금확인/예약확정"(예약금 확인 완료) 두 단계로 나눈다.
--
-- enum 값 이름만 바꾸는 것이라 기존 데이터(모든 confirmed 행)는
-- 자동으로 schedule_confirmed가 되고 그대로 유지된다 — 별도 UPDATE가
-- 필요 없다.
--
-- ⚠️ 이 파일은 반드시 다음 파일
-- (20261017000200_reservation_status_split_constraints.sql)보다
-- 먼저, 그리고 완전히 별도로(따로 붙여넣고 실행) 실행해야 한다.
-- 방금 추가한 enum 값(payment_confirmed)은 그 값을 추가한 것과 같은
-- 트랜잭션에서는 바로 쓸 수 없다는 PostgreSQL 제약 때문이다.
alter type reservation_status rename value 'confirmed' to 'schedule_confirmed';
alter type reservation_status add value 'payment_confirmed' after 'schedule_confirmed';
