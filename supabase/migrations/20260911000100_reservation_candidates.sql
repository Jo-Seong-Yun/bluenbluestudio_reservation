-- 손님이 시간 하나만 고르고 그게 즉시 접수되던 방식을, "3지망까지 후보를
-- 내고 관리자가 그중 하나를 골라 확정"하는 방식으로 바꾼다.
--
-- 핵심 변화: "접수(requested) = 그 시간을 즉시 점유"가 아니게 된다.
-- 후보는 그냥 선호일 뿐이고(겹쳐도 됨 — 여러 손님이 같은 시간을 후보로
-- 낼 수 있다), 관리자가 하나를 골라 확정(confirmed)하는 순간에만 그
-- 시간이 실제로 점유된다. 그래서 reservations의 시간 컬럼들이 접수
-- 시점엔 비어 있다가 확정 시점에 채워지도록 nullable로 바꾼다.
--
-- 기존에 이미 있던 requested 예약들(이 마이그레이션 이전 방식으로 들어온
-- 것들)은 손대지 않는다 — period/shoot_start/shoot_end가 이미 채워진
-- 채로 남고, 화면에서는 "후보 없이 이미 그 시간으로 접수된 예약"으로
-- 계속 다룰 수 있다(reservation_candidates에 행이 없으면 그런 예약).

alter table reservations
  alter column period drop not null,
  alter column shoot_start drop not null,
  alter column shoot_end drop not null;

-- 확정 시 후보 3개 중 어느 것을 골랐는지 기록. 나머지 후보는 지우지
-- 않고 reservation_candidates에 이력으로 남긴다 — 이 컬럼으로 어느
-- rank가 선택됐는지 구분한다.
alter table reservations
  add column confirmed_candidate_rank int
    check (confirmed_candidate_rank is null or confirmed_candidate_rank between 1 and 3);

-- 손님이 낸 시간 후보들. 의도적으로 겹침 방지 제약을 걸지 않는다 —
-- 확정 전까지는 잠그지 않는 정책이라, 다른 손님이 같은 시간을 후보로
-- 내도 통과해야 한다. 실제 잠금은 reservations.period의 기존 EXCLUDE
-- 제약이 confirmed 상태에서만 담당한다.
create table reservation_candidates (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  rank           int not null check (rank between 1 and 3),
  shoot_start    timestamptz not null,
  shoot_end      timestamptz not null,
  period         tstzrange not null,
  created_at     timestamptz not null default now(),
  constraint reservation_candidates_range check (shoot_end > shoot_start),
  unique (reservation_id, rank)
);

create index reservation_candidates_reservation_idx
  on reservation_candidates (reservation_id);

-- 확정 화면에서 "이 시간대에 다른 손님도 후보를 냈나"를 보여주려고
-- 기간으로도 찾을 수 있게 둔다(정확한 이중예약 방지용은 아니다 — 그건
-- reservations.period가 맡는다).
create index reservation_candidates_period_idx
  on reservation_candidates using gist (period);

alter table reservation_candidates enable row level security;

-- 손님(anon)은 후보 테이블에 직접 쓰지 않는다 — 아래 RPC 함수가
-- SECURITY DEFINER로 reservations+candidates를 한 번에 만든다. 관리자는
-- 확정 화면에서 후보를 봐야 하니 조회만 열어준다.
create policy "관리자만 후보 조회"
  on reservation_candidates for select
  to authenticated
  using (true);

-- 손님 예약 신청. reservations 1행과 candidates 여러 행을 한 트랜잭션
-- 안에서 만든다 — 앱 코드에서 두 단계로 나눠 하면 중간에 실패했을 때
-- "예약은 있는데 후보가 없는" 반쪽 상태가 남을 수 있다.
--
-- 후보 배열은 1~3개를 받는다(정확히 3개 강제는 앱단 검증 몫으로 둔다 —
-- DB 함수까지 개수를 못박으면 나중에 후보 수를 바꿀 때 마이그레이션이
-- 또 필요해진다). 여기서는 운영시간·리드타임 재검증을 하지 않는다 —
-- 기존 방식과 동일하게 Next.js가 loadAvailableSlots로 이미 확인한
-- 뒤에만 이 함수를 부른다(createReservation 참고). 후보는 겹쳐도
-- 통과해야 하는 정책이라 여기서 막을 것도 없다.
create or replace function create_reservation_with_candidates(
  p_code text,
  p_product_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_gender text,
  p_birth_date date,
  p_candidate_starts timestamptz[],
  p_candidate_ends timestamptz[]
)
returns reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations;
  v_count int := coalesce(array_length(p_candidate_starts, 1), 0);
  i int;
begin
  if v_count = 0 or v_count > 3 then
    raise exception '후보 시간은 1개 이상 3개 이하여야 합니다.';
  end if;
  if array_length(p_candidate_ends, 1) is distinct from v_count then
    raise exception '후보 시작/종료 배열 길이가 다릅니다.';
  end if;

  insert into reservations (
    code, product_id, customer_name, customer_phone, customer_email,
    gender, birth_date, status
  ) values (
    p_code, p_product_id, p_customer_name, p_customer_phone, p_customer_email,
    p_gender, p_birth_date, 'requested'
  )
  returning * into v_reservation;

  for i in 1 .. v_count loop
    insert into reservation_candidates (reservation_id, rank, shoot_start, shoot_end, period)
    values (
      v_reservation.id,
      i,
      p_candidate_starts[i],
      p_candidate_ends[i],
      tstzrange(p_candidate_starts[i], p_candidate_ends[i], '[)')
    );
  end loop;

  return v_reservation;
end;
$$;

revoke all on function create_reservation_with_candidates(
  text, uuid, text, text, text, text, date, timestamptz[], timestamptz[]
) from public;
grant execute on function create_reservation_with_candidates(
  text, uuid, text, text, text, text, date, timestamptz[], timestamptz[]
) to anon, authenticated;

-- 손님 자가 취소 재정의. 후보만 낸 채 아직 확정 전(shoot_start가
-- null)이면 촬영 시간 자체가 없어 "취소 기한"이라는 개념이 적용될 수
-- 없다 — 그 경우엔 기한을 따지지 않고 바로 취소한다. 확정된 뒤라면
-- 기존 로직(촬영 기준 cancel_deadline_hours 전까지만) 그대로다.
create or replace function cancel_reservation(p_code text, p_phone text)
returns setof reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations;
  v_deadline_hours int;
begin
  select * into v_reservation
  from reservations
  where code = p_code and customer_phone = p_phone
  for update;

  if not found then
    return;
  end if;

  if v_reservation.status not in ('requested', 'confirmed') then
    return next v_reservation;
    return;
  end if;

  if v_reservation.shoot_start is not null then
    select cancel_deadline_hours into v_deadline_hours from settings where id = 1;

    if now() > v_reservation.shoot_start - make_interval(hours => v_deadline_hours) then
      return next v_reservation;
      return;
    end if;
  end if;

  update reservations
  set status = 'cancelled'
  where id = v_reservation.id
  returning * into v_reservation;

  return next v_reservation;
end;
$$;
