-- 이메일 규칙의 트리거 종류에 예약 상태 세분화(일정확정/입금확인/
-- 완료/노쇼)를 반영한다. on_confirmed 하나였던 트리거를
-- on_schedule_confirmed/on_payment_confirmed로 나누고, 지금까지 아예
-- 없었던 on_completed/on_no_show를 새로 더한다.
alter table email_rules drop constraint email_rules_trigger_type_check;

-- 기존에 "예약 확정 시(on_confirmed)"로 만들어둔 규칙은 의미상 더
-- 가까운 "일정확정 시(on_schedule_confirmed)"로 옮긴다 — 후보 시간을
-- 하나 골라 확정하는 순간 나가던 문구이므로 그렇다.
update email_rules set trigger_type = 'on_schedule_confirmed' where trigger_type = 'on_confirmed';

alter table email_rules add constraint email_rules_trigger_type_check check (trigger_type in (
  'on_requested', 'on_schedule_confirmed', 'on_payment_confirmed', 'on_completed',
  'on_no_show', 'on_cancelled', 'on_rescheduled', 'on_admin_new_request',
  'days_before_shoot', 'days_after_shoot'
));
