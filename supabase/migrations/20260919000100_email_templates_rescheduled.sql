-- 관리자가 확정된 예약의 일정(날짜·시간)을 직접 바꿀 수 있는 기능을
-- 추가하면서, 그때 손님에게 보내는 "예약 일정 변경" 안내를 위한
-- email_templates 목적(customer_rescheduled)을 추가한다.
--
-- email_templates_purpose_check는 원래 마이그레이션(20260912000100)의
-- `purpose text primary key check (purpose in (...))`에서 Postgres가
-- 자동으로 붙인 이름이다 — 열 하나짜리 check는 관례상 `{테이블}_{열}_check`
-- 로 이름 붙는다.

alter table email_templates
  drop constraint email_templates_purpose_check;

alter table email_templates
  add constraint email_templates_purpose_check
  check (purpose in (
    'customer_requested', 'customer_confirmed', 'customer_cancelled',
    'customer_reminder', 'customer_rescheduled', 'admin_new_request'
  ));

insert into email_templates (purpose, subject, body) values
(
  'customer_rescheduled',
  '[푸르른 스튜디오] 예약 일정이 변경되었습니다',
  '{{이름}}님, 예약 일정이 변경되었습니다.

상품: {{상품명}}
기존 일시: {{기존일시}}
변경된 일시: {{변경일시}}
예약번호: {{예약번호}}'
)
on conflict (purpose) do nothing;
