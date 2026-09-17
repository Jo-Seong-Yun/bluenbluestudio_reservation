-- product_views/booking_list_views는 관리자에게 select 권한만 열려
-- 있었다("관리자 조회" 정책) — "통계 리셋" 버튼이 delete를 시도해도
-- 이 delete를 허용하는 정책이 하나도 없어 RLS가 조용히 0건만 지우고
-- 끝나 버렸다(에러 없이 그냥 안 지워짐). 관리자에게 delete 권한을
-- 추가로 연다.
create policy "관리자 삭제"
  on product_views for delete
  to authenticated
  using (true);

create policy "관리자 삭제"
  on booking_list_views for delete
  to authenticated
  using (true);
