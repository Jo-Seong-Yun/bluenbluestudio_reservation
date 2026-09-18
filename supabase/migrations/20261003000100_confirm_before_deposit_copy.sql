-- 예약 순서를 "예약금 입금 → 날짜 확정"에서 "날짜 확정 → 예약금 입금"으로
-- 바꾼다. 실제 예약 처리 로직(관리자가 확정 버튼을 누르는 시점, 취소
-- 정책)은 그대로 두고, 옛 순서를 설명하던 문구만 새 순서에 맞게 고친다.
--
-- 관리자가 이미 직접 고쳐 둔 문구는 옛 기본값 문자열과 더는 정확히
-- 일치하지 않으므로 이 replace()는 그런 값을 건드리지 않는다.
update settings
set reservation_success_message = replace(
  reservation_success_message,
  '예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을 입금하시면 신청하신 희망 시간 중 하나로 예약이 확정됩니다.',
  '예약 내역은 입력하신 연락처로 조회할 수 있으며, 신청하신 희망 시간 중 하나로 확정해드리면 아래 계좌로 예약금을 입금해 주세요.'
)
where id = 1;

update email_templates
set body = replace(
  body,
  '예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을 입금하시면 예약이 최종 확정됩니다.',
  '예약 내역은 입력하신 연락처로 조회할 수 있으며, 신청하신 희망 시간 중 하나로 확정해드리면 아래 계좌로 예약금을 입금해 주세요.'
)
where purpose = 'customer_requested';

-- 새로 설치되는 환경의 기본값도 새 순서로 맞춰둔다.
alter table settings
  alter column reservation_success_message
  set default '예약 내역은 입력하신 연락처로 조회할 수 있으며, 신청하신 희망 시간 중 하나로 확정해드리면 아래 계좌로 예약금을 입금해 주세요.';
