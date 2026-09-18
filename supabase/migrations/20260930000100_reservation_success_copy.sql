-- 예약 신청 완료 화면(손님이 신청서를 제출한 직후 보는 화면)의 제목과
-- 설명 문구를 관리자가 직접 고칠 수 있게 한다. 지금까지는 코드에
-- 고정돼 있었다 — not null default로 지금 고정 문구 그대로를 넣어
-- 기존 화면은 그대로 두고, 나중에 관리자 설정 화면에서만 바뀐다.
alter table settings
  add column reservation_success_heading text not null
    default '예약 신청이 접수되었습니다',
  add column reservation_success_message text not null
    default '예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을 입금하시면 신청하신 희망 시간 중 하나로 예약이 확정됩니다.';
