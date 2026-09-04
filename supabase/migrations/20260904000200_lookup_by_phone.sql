-- 전화번호만으로 자신의 예약 목록을 조회한다.
--
-- 예약번호까지 외우고 있어야 하는 건 번거롭다. lookup_reservation()은
-- 정확히 한 건을 코드+연락처로 집어서 찾을 때(취소 직전 확인 등) 그대로
-- 남겨두고, 이 함수는 전화번호 하나로 그 번호에 걸린 예약을 전부 보여준다.
--
-- products와 조인해서 상품 이름까지 한 번에 돌려준다. SECURITY DEFINER라
-- 상품이 나중에 비공개 처리돼도(is_published=false) 손님이 자기 예약
-- 내역에서 상품 이름을 계속 볼 수 있다 — "공개 상품 조회" RLS를
-- 우회하는 게 아니라, 애초에 이 함수 자체가 그 제약 밖에서 동작한다.

create or replace function lookup_reservations_by_phone(p_phone text)
returns table (
  code text,
  status reservation_status,
  shoot_start timestamptz,
  shoot_end timestamptz,
  customer_name text,
  product_name text
)
language sql
security definer
set search_path = public
as $$
  select r.code, r.status, r.shoot_start, r.shoot_end, r.customer_name, p.name as product_name
  from reservations r
  join products p on p.id = r.product_id
  where r.customer_phone = p_phone
  order by r.shoot_start desc;
$$;

revoke all on function lookup_reservations_by_phone(text) from public;
grant execute on function lookup_reservations_by_phone(text) to anon, authenticated;
