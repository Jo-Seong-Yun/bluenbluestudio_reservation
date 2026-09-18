-- 진단해보니 product_views/booking_list_views에 행이 하나도 없었다 —
-- INSERT 정책이 anon에게만 열려 있어서, 관리자로 로그인한 채로(=
-- authenticated 역할로) 손님 화면을 테스트하면 그 요청은 이 정책에
-- 안 걸려 RLS가 조용히 막는다(에러 없이 그냥 안 쌓인다). 로그인 여부와
-- 무관하게 조회가 기록되도록 authenticated에게도 같은 INSERT를 연다 —
-- 두 테이블 다 민감한 개인정보 없이 조회 시각(과 상품 id)만 담으니
-- 안전하다.
create policy "관리자 조회 기록"
  on product_views for insert
  to authenticated
  with check (true);

create policy "관리자 조회 기록"
  on booking_list_views for insert
  to authenticated
  with check (true);
