-- 푸르른 스튜디오 예약 사이트 — 데이터베이스 초기 설정
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 Run 한 번만 누르면 된다.
-- (supabase/migrations/ 의 6개 파일을 순서대로 합친 것이다)


-- ============================================================
-- 20260903000100_extensions.sql
-- ============================================================

-- 이중예약 방지(EXCLUDE 제약)에 필요한 확장.
-- gist 인덱스에 등호(=) 비교를 쓸 수 있게 해준다.
create extension if not exists btree_gist;

-- 공통으로 쓰는 updated_at 자동 갱신 트리거 함수.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 20260903000200_products.sql
-- ============================================================

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

-- ============================================================
-- 20260903000300_schedule.sql
-- ============================================================

-- 스케줄 3층 구조: weekly_hours(반복) -> date_overrides(날짜 예외) -> blocks(구간 차단)
-- 아래 층이 위 층을 덮어쓴다. 학생 사장님의 일정이 자주 바뀌는 상황에 맞춘 설계다.
-- (docs/ROADMAP.md 2-2)
--
-- 세 테이블 모두 관리자만 접근한다. 손님 화면에 보여줄 "예약 가능 시간"은
-- Next.js 서버가 service role 키로 이 테이블들을 읽어 계산해서 내려준다
-- (Phase 3). 그래서 anon 대상 select 정책은 두지 않는다 — 사유(reason)에
-- "시험", "개인 일정" 같은 사적인 내용이 들어갈 수 있기 때문이다.

-- 1층: 요일별 기본 운영시간
create table weekly_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 0 and 6), -- 0 = 일요일
  open_time  time not null,
  close_time time not null,
  constraint weekly_hours_valid_range check (close_time > open_time)
);

create index weekly_hours_weekday_idx on weekly_hours (weekday);

-- 2층: 날짜별 예외 (그날만 휴무이거나 시간이 다름)
create table date_overrides (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  is_closed  boolean not null default false,
  open_time  time,
  close_time time,
  reason     text,
  constraint date_overrides_hours_or_closed check (
    is_closed
    or (open_time is not null and close_time is not null and close_time > open_time)
  )
);

create index date_overrides_date_idx on date_overrides (date);

-- 3층: 시간 구간 차단 (갑자기 생긴 개인 일정)
create table blocks (
  id         uuid primary key default gen_random_uuid(),
  period     tstzrange not null,
  reason     text,
  created_at timestamptz not null default now()
);

-- gist 인덱스. blocks끼리는 겹쳐도 무해하므로(둘 다 막힌 상태) EXCLUDE는 두지 않는다.
create index blocks_period_idx on blocks using gist (period);

alter table weekly_hours  enable row level security;
alter table date_overrides enable row level security;
alter table blocks         enable row level security;

create policy "관리자만 접근" on weekly_hours
  for all to authenticated using (true) with check (true);

create policy "관리자만 접근" on date_overrides
  for all to authenticated using (true) with check (true);

create policy "관리자만 접근" on blocks
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 20260903000400_reservations.sql
-- ============================================================

-- 예약.
-- (docs/ROADMAP.md 2-3, 2-5)

create type reservation_status as enum
  ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');

create table reservations (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,        -- 손님용 예약번호. 앱에서 생성
  product_id     uuid not null references products(id),
  period         tstzrange not null,           -- 버퍼 포함 점유 구간 (이중예약 판정 기준)
  shoot_start    timestamptz not null,         -- 손님에게 보여줄 실제 촬영 시작 시각
  shoot_end      timestamptz not null,
  status         reservation_status not null default 'requested',
  customer_name  text not null,
  customer_phone text not null,
  people_count   int check (people_count is null or people_count > 0),
  memo           text,                         -- 손님이 남긴 요청사항
  admin_memo     text,                         -- 사장님 메모. 손님에게 노출 안 됨
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reservations_shoot_range check (shoot_end > shoot_start)
);

create index reservations_product_idx on reservations (product_id);
create index reservations_status_idx  on reservations (status);
create index reservations_period_idx  on reservations using gist (period);

create trigger reservations_set_updated_at
  before update on reservations
  for each row execute function set_updated_at();

-- ★ 이중예약 방지. 앱 코드로 "비었는지 확인 후 저장"하면 동시 요청에 뚫린다.
-- 진행 중인 예약(requested/confirmed)끼리 시간이 겹치면 DB가 즉시 거절한다.
alter table reservations
  add constraint reservations_no_overlap
  exclude using gist (period with &&)
  where (status in ('requested', 'confirmed'));

alter table reservations enable row level security;

-- 손님(anon)은 예약 테이블을 직접 조회할 수 없다.
-- "예약번호+연락처로 조회"는 아래 lookup_reservation() 함수로만 가능하다.
-- (테이블에 직접 SELECT를 열면 WHERE 절과 무관하게 전체 예약이 노출될 수 있다)

create policy "손님 예약 신청"
  on reservations for insert
  to anon
  with check (status = 'requested');

create policy "관리자 전체 조회"
  on reservations for select
  to authenticated
  using (true);

create policy "관리자 예약 관리"
  on reservations for update
  to authenticated
  using (true)
  with check (true);

-- 예약 기록은 앱에서 삭제하지 않는다. 취소는 status='cancelled' 처리로 한다.
-- (삭제 정책을 아예 두지 않으면 authenticated 라도 DELETE가 거절된다)

-- 손님이 예약번호 + 연락처로 자기 예약만 확인하는 통로.
-- SECURITY DEFINER로 RLS를 우회하되, 함수 내부에서 정확히 일치하는 한 건만 반환한다.
create or replace function lookup_reservation(p_code text, p_phone text)
returns setof reservations
language sql
security definer
set search_path = public
as $$
  select *
  from reservations
  where code = p_code
    and customer_phone = p_phone;
$$;

revoke all on function lookup_reservation(text, text) from public;
grant execute on function lookup_reservation(text, text) to anon, authenticated;

-- ============================================================
-- 20260903000500_settings.sql
-- ============================================================

-- 배포 없이 바꾸는 값들. 항상 한 행만 존재한다(id=1).
-- (docs/ROADMAP.md 2-4)

create table settings (
  id                    int primary key default 1 check (id = 1),
  slot_interval_min     int  not null default 60,  -- 예약 슬롯 간격
  min_lead_days         int  not null default 1,   -- 최소 며칠 전 (1 = 당일 예약 불가, 내일부터)
  max_advance_days      int  not null default 60,  -- 몇 일 뒤까지 예약을 열어둘지
  cancel_deadline_hours int  not null default 48,  -- 손님 자가 취소 가능 기한
  bank_account          text,                      -- 입금 계좌 안내
  studio_intro          text,                      -- 랜딩 소개 문구 (마크다운)
  notice                text,                      -- 예약 페이지 공지
  updated_at            timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- 기본값 한 행을 만들어둔다. 관리자 화면은 이 행을 항상 UPDATE만 한다.
insert into settings (id) values (1);

alter table settings enable row level security;

-- 전부 손님에게 보여줄 목적의 값들이라 조회는 공개한다 (계좌번호, 공지 등).
create policy "누구나 설정 조회"
  on settings for select
  to anon, authenticated
  using (true);

create policy "관리자만 설정 수정"
  on settings for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 20260903000600_storage.sql
-- ============================================================

-- 상품 이미지 저장용 버킷.
-- 대표 이미지/갤러리는 공개로 보여줘야 하므로 버킷 자체는 public.
-- 업로드/수정/삭제는 관리자만.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "상품 이미지 공개 조회"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "관리자만 상품 이미지 업로드"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "관리자만 상품 이미지 수정"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

create policy "관리자만 상품 이미지 삭제"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
