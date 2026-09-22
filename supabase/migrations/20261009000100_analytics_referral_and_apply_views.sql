-- 통계 보완 (1): 유입경로(ref) 기록. 손님이 홍보 링크 끝에 붙여오는
-- ?ref=insta 같은 값을 조회·예약 기록에 같이 남겨, 어느 채널이
-- 실제 예약으로 이어지는지 비교할 수 있게 한다.
alter table product_views add column ref text;
alter table booking_list_views add column ref text;
alter table reservations add column ref text;

-- 통계 보완 (2): 상품 상세와 실제 예약 사이에 "신청서 화면까지는
-- 왔는지"를 따로 본다 — 날짜/시간 선택 단계 이탈과 신청서 작성 단계
-- 이탈을 구분하기 위해서다. product_views와 같은 형태.
create table apply_views (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ref        text,
  viewed_at  timestamptz not null default now()
);

create index apply_views_product_idx on apply_views (product_id);
create index apply_views_viewed_at_idx on apply_views (viewed_at);

alter table apply_views enable row level security;

create policy "손님 조회 기록"
  on apply_views for insert
  to anon
  with check (true);

-- product_views/booking_list_views가 20261001000100에서 겪은 문제
-- (관리자로 로그인한 채 손님 화면을 테스트하면 anon 전용 INSERT
-- 정책에 안 걸려 조용히 기록이 안 쌓임)를 처음부터 피하려고 authenticated도
-- 같이 연다. 다만 관리자 자신의 조회는 이제 애플리케이션 코드
-- (lib/booking/actions.ts)에서 로그인 여부를 보고 아예 기록을 안 남기도록
-- 걸러낸다 — 그래서 실제로는 이 정책까지 갈 일이 거의 없지만, 막아두면
-- 나중에 그 필터를 깜빡 지웠을 때도 조용히 실패하는 대신 정상 동작한다.
create policy "관리자 조회 기록"
  on apply_views for insert
  to authenticated
  with check (true);

create policy "관리자 조회"
  on apply_views for select
  to authenticated
  using (true);

create policy "관리자 삭제"
  on apply_views for delete
  to authenticated
  using (true);
