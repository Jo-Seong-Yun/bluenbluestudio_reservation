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
