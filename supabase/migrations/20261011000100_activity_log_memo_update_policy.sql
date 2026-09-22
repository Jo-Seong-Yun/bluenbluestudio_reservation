-- 상세 로그 메모(20261010000100_activity_log_memo.sql에서 추가한 memo
-- 컬럼) 저장이 조용히 실패하는 버그 수정. product_views/
-- booking_list_views/apply_views 세 테이블에 select/insert/delete
-- 정책만 있고 update 정책이 없어서, 관리자가 메모를 저장해도 RLS가
-- 그 update를 막고 있었다(에러도 안 나고 그냥 0행이 바뀐 채 조용히
-- 넘어간다 — 새로고침하면 사라지는 것처럼 보인 이유).
create policy "관리자 메모 수정"
  on product_views for update
  to authenticated
  using (true)
  with check (true);

create policy "관리자 메모 수정"
  on booking_list_views for update
  to authenticated
  using (true)
  with check (true);

create policy "관리자 메모 수정"
  on apply_views for update
  to authenticated
  using (true)
  with check (true);
