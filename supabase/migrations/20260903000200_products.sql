-- 촬영 상품.
-- 사장님이 관리자 화면에서 직접 추가·수정하고, 설명은 마크다운으로 자유롭게 쓴다.
-- (docs/ROADMAP.md 2-1)

create table products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  duration_min      int  not null default 60 check (duration_min > 0),
  buffer_after_min  int  not null default 0  check (buffer_after_min >= 0),
  price             int  not null check (price >= 0),
  summary           text,
  description       text,                 -- 마크다운
  cover_image       text,                 -- Storage 경로(product-images 버킷)
  gallery           text[] not null default '{}',
  max_people        int check (max_people is null or max_people > 0),
  is_published      boolean not null default false,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index products_published_sort_idx
  on products (is_published, sort_order);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

alter table products enable row level security;

-- 손님: 공개된 상품만 조회
create policy "공개 상품 조회"
  on products for select
  to anon, authenticated
  using (is_published = true);

-- 관리자(로그인한 사용자): 전체 조회·관리
-- 주의: Supabase Auth에서 이메일 회원가입을 반드시 꺼두어야 한다.
-- 그렇지 않으면 누구나 가입해서 "authenticated"가 되어 관리자 권한을 갖는다.
-- 설정 방법: docs/SUPABASE_SETUP.md 참고.
create policy "관리자 전체 조회"
  on products for select
  to authenticated
  using (true);

create policy "관리자 상품 추가"
  on products for insert
  to authenticated
  with check (true);

create policy "관리자 상품 수정"
  on products for update
  to authenticated
  using (true)
  with check (true);

create policy "관리자 상품 삭제"
  on products for delete
  to authenticated
  using (true);
