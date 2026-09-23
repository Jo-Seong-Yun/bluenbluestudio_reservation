-- 상태 변경을 엄격한 파이프라인(일정확정→입금확인→완료|노쇼, 언제든
-- 취소 가능)으로 바꾸면서 필요해진 컬럼 두 개.
--
-- cancel_reason: 취소 사유. 취소할 때 반드시 입력해야 한다(화면에서
-- 강제). {{취소사유}} 이메일 변수로도 쓸 수 있다.
--
-- status_before_cancel: 취소되기 직전 상태(schedule_confirmed 등).
-- "휴지통"에서 복원할 때 이 값으로 되돌린다 — 취소는 requested/
-- schedule_confirmed/payment_confirmed 중 어디서든 될 수 있어서, 복원
-- 시 단순히 "일정확정으로" 고정할 수 없다.
alter table reservations
  add column cancel_reason text,
  add column status_before_cancel reservation_status;
