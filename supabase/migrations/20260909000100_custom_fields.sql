-- 예약별 실제 지불액, 성별·생년월일, 커스텀 신청 문항.
--
-- 지금까지 매출은 "상품 정가 × 건수"로만 계산했는데, 할인 이벤트 등으로
-- 실제 받는 금액이 매번 다를 수 있어 예약 건마다 실제 지불액을 따로
-- 적게 한다. 원가(cost)와 마찬가지로 관리자가 예약 상세에서 직접
-- 입력하고, 입력 전에는 null(=매출 계산에서 0으로 취급)이다.
alter table reservations
  add column charged_amount integer check (charged_amount is null or charged_amount >= 0);

-- 성별·생년월일. 미성년자 여부 확인 등에 쓴다. 둘 다 필수 입력이라
-- not null로 걸어두되, 기존에 이미 들어있는 예약들은 값이 없을 테니
-- null을 허용한 채로 추가하고 앱에서 새 신청부터 필수로 받는다
-- (스키마 레벨에서 not null을 걸면 기존 행 때문에 마이그레이션 자체가
-- 실패한다).
alter table reservations
  add column gender text check (gender in ('male', 'female')),
  add column birth_date date;

-- 관리자가 자유롭게 추가하는 신청 문항(구글폼처럼). 손님용 신청서에는
-- 이름·연락처처럼 원래 있던 필드 다음에 sort_order 순서로 붙는다.
create table custom_fields (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  type       text not null check (
    type in ('short_text', 'long_text', 'single_choice', 'multi_choice', 'checkbox')
  ),
  -- single_choice/multi_choice일 때 보기 목록. 예: ["옵션1", "옵션2"]
  options    jsonb,
  required   boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 손님용 신청서가 문항 목록을 읽어야 하니 조회는 공개, 나머지는 관리자만.
alter table custom_fields enable row level security;

create policy "누구나 문항 조회"
  on custom_fields for select
  using (true);

create policy "관리자만 문항 관리"
  on custom_fields for all
  to authenticated
  using (true)
  with check (true);

-- 커스텀 문항에 대한 손님 답변. 문항 하나당 답변 하나(선택형은 값을
-- JSON 배열 문자열로 저장) — reservation당 문항 수만큼 행이 생긴다.
create table reservation_answers (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  field_id       uuid not null references custom_fields(id) on delete cascade,
  value          text not null,
  created_at     timestamptz not null default now()
);

create index reservation_answers_reservation_id_idx
  on reservation_answers(reservation_id);

alter table reservation_answers enable row level security;

-- 손님이 예약 신청과 함께 답변을 넣는다. reservations 테이블의 "손님
-- 예약 신청" 정책과 같은 이유로 anon에게 INSERT만 열어둔다 — 조회·수정·
-- 삭제는 관리자만.
create policy "손님 답변 등록"
  on reservation_answers for insert
  to anon
  with check (
    exists (
      select 1 from reservations r
      where r.id = reservation_id and r.status = 'requested'
    )
  );

create policy "관리자 답변 관리"
  on reservation_answers for all
  to authenticated
  using (true)
  with check (true);
