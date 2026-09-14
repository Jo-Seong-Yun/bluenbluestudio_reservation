-- 지불액/원가 각각에 별도 메모를 남길 수 있게.
--
-- 관리자 화면에서 "실제 지불액"이나 "촬영 원가"를 입력할 때, 그 금액이
-- 왜 그런지(예: "쿠폰 할인 적용", "소품 대여비 추가") 같이 적어둘 수
-- 있어야 나중에 봐도 헷갈리지 않는다. 기존 admin_memo(예약 전체에 대한
-- 메모)와는 별개로, 금액 하나하나에 붙는 메모라 각 컬럼을 따로 둔다.
alter table reservations
  add column charged_amount_memo text,
  add column cost_memo text;
