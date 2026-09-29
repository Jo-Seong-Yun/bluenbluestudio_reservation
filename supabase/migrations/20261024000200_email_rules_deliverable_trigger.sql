-- 예약관리의 "결과물 전송" 버튼용 새 트리거(on_deliverable_sent)를
-- email_rules.trigger_type이 허용하는 값에 더한다. 예약 상태와는
-- 무관한 별도 이메일 발송 지점이다(완료 처리와는 다른 순간 — 촬영이
-- 끝난 뒤 편집본을 실제로 넘길 때).
alter table email_rules drop constraint email_rules_trigger_type_check;

alter table email_rules add constraint email_rules_trigger_type_check check (trigger_type in (
  'on_requested', 'on_schedule_confirmed', 'on_payment_confirmed', 'on_completed',
  'on_no_show', 'on_cancelled', 'on_rescheduled', 'on_admin_new_request',
  'on_deliverable_sent', 'days_before_shoot', 'days_after_shoot'
));
