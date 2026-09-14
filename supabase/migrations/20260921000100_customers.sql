-- 손님(고객) 테이블.
--
-- 지금까지는 "고객DB" 화면·구글 시트가 손님 정보를 예약 기록에서 매번
-- 다시 계산해서 보여줬다 — 저장된 손님 행 자체가 없어 수기로 고칠
-- 자리가 없었다(고쳐도 다음 예약이 들어오면 그 예약의 원본 값으로
-- 다시 덮어써진다). 이제 손님 한 명 = 행 하나로 따로 저장해, 관리자가
-- 직접 수정할 수 있게 한다.
--
-- 방문 이력(첫방문일·최근방문일·총방문횟수)은 여기 저장하지 않는다 —
-- 그건 예약 기록에서 그때그때 다시 계산해야 정확하다(수기로 고칠
-- 대상이 아니다). 이 테이블은 이름·성별·생년월일·이메일처럼 "사람에
-- 대한 정보"만 담는다.
create table customers (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  name       text not null,
  gender     text check (gender in ('male', 'female')),
  birth_date date,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

alter table customers enable row level security;

create policy "관리자만 접근" on customers
  for all to authenticated using (true) with check (true);
