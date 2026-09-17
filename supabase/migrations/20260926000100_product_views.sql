-- 상품 상세 페이지 조회 기록.
--
-- 관리자가 상품별로 "링크 진입 횟수"와 "진입이 실제 신청으로 이어지는
-- 비율"을 보고 싶어 해서 만든다. 한 번의 조회 = 한 줄. 손님이 같은
-- 페이지를 여러 번 봐도(새로고침 등) 그대로 여러 줄로 쌓인다 — 방문자
-- 고유 식별은 하지 않는, 가장 단순한 형태의 "조회수" 집계다(정밀한
-- 순 방문자 집계가 필요해지면 그때 별도 테이블로 확장한다).
create table product_views (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  viewed_at  timestamptz not null default now()
);

create index product_views_product_idx on product_views (product_id);
create index product_views_viewed_at_idx on product_views (viewed_at);

alter table product_views enable row level security;

-- 손님(anon)이 상품 상세 페이지를 열 때마다 서버에서 한 줄 기록한다.
-- 조회 자체는 손님에게 보여줄 정보가 아니므로 anon에게 SELECT는 열지 않는다.
create policy "손님 조회 기록"
  on product_views for insert
  to anon
  with check (true);

create policy "관리자 조회"
  on product_views for select
  to authenticated
  using (true);
