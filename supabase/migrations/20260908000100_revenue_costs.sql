-- 순이익 추적 (매출 관리 확장).
--
-- 매출만 봐서는 실제로 남는 돈을 알 수 없다. 촬영 한 건마다 드는 원가
-- (대관료, 소품, 외주 등)와 촬영과 무관한 월별 고정비(임대료, 장비,
-- 마케팅 등)를 따로 기록해서 순이익 = 매출 - 원가 - 고정비로 본다.

-- 예약 한 건의 원가. 관리자가 예약 상세에서 직접 입력한다.
-- 입력 전에는 null(=0으로 취급)이라, 기존 예약이 매출 화면에서 갑자기
-- 원가로 잡히지 않는다.
alter table reservations
  add column cost integer check (cost is null or cost >= 0);

-- 촬영과 무관한 월별 고정비. 한 달에 여러 항목(임대료, 장비, 마케팅 등)이
-- 있을 수 있어 한 행 = 한 항목으로 둔다.
create table monthly_expenses (
  id         uuid primary key default gen_random_uuid(),
  month      text not null,  -- "YYYY-MM"
  label      text not null,
  amount     integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index monthly_expenses_month_idx on monthly_expenses(month);

alter table monthly_expenses enable row level security;

create policy "관리자만 접근" on monthly_expenses
  for all to authenticated using (true) with check (true);
