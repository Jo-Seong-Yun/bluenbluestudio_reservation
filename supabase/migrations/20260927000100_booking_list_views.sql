-- 상품 목록(예약하기 첫 화면) 진입 기록.
--
-- 관리자가 "상품 목록 진입 수 → 상품 상세 진입 수(product_views) → 실제
-- 예약 수(reservations)" 3단계 퍼널을 보고 싶어 해서 만든다. product_views와
-- 같은 형태다 — 한 번의 방문 = 한 줄, 고유 방문자 식별은 하지 않는다.
create table booking_list_views (
  id         uuid primary key default gen_random_uuid(),
  viewed_at  timestamptz not null default now()
);

create index booking_list_views_viewed_at_idx on booking_list_views (viewed_at);

alter table booking_list_views enable row level security;

create policy "손님 조회 기록"
  on booking_list_views for insert
  to anon
  with check (true);

create policy "관리자 조회"
  on booking_list_views for select
  to authenticated
  using (true);
