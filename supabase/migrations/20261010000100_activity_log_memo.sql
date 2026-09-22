-- 통계 화면 "상세 로그"에서 각 조회 기록에 메모를 남길 수 있게 한다.
-- 예약(reservations)은 이미 admin_memo가 있어 그걸 그대로 쓰고, 나머지
-- 세 종류(목록 진입/상품 상세 진입/신청서 진입)에는 메모 컬럼이 없어
-- 새로 추가한다.
alter table booking_list_views add column memo text;
alter table product_views add column memo text;
alter table apply_views add column memo text;
