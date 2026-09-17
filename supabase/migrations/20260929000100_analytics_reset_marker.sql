-- "통계 리셋" 버튼을 실제 행 삭제에서 "리셋 시점 기록"으로 바꾼다.
--
-- 원래는 product_views/booking_list_views 행을 통째로 지웠는데, 그러면
-- 관리자가 나중에 "언제 조회가 있었는지" 하나하나 보고 싶어하는 상세
-- 로그까지 같이 사라져 버린다. 그래서 실제로는 지우지 않고, 이 시점을
-- settings에 기록해 두고 집계(퍼널·동향·상품별 표)만 이 시점 이후
-- 것으로 다시 센다 — 상세 로그는 계속 전체 기록을 보여준다.
alter table settings
  add column analytics_reset_at timestamptz;

-- 더 이상 delete로 리셋하지 않으므로, 지난 마이그레이션에서 연
-- delete 권한은 다시 닫는다(조회 기록을 실수로/부주의하게 지울 수
-- 있는 경로를 없앤다).
drop policy "관리자 삭제" on product_views;
drop policy "관리자 삭제" on booking_list_views;
