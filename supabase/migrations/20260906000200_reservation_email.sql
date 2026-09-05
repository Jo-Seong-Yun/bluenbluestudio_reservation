-- 손님 이메일 (선택 입력).
--
-- 예약 폼에는 원래 연락처(전화번호)만 있었다 — 알림도 SMS만 나갔다.
-- 이메일을 입력한 손님에게는 SMS와 함께 이메일로도 접수/확정/취소/
-- 리마인드 안내를 보내려고 추가한다. 선택 입력이라 not null이 아니다.
alter table reservations
  add column customer_email text;
