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
