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
