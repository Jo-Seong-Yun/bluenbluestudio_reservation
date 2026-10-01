-- 예약번호만 대조합니다. 기존 연락처 조회·취소 RPC는 유지합니다.
-- 신청서 답변, 이메일, 내부 메모 등 불필요한 정보는 반환하지 않습니다.
create or replace function public.lookup_reservation_by_code(p_code text)
returns table (
  code text,
  status public.reservation_status,
  shoot_start timestamptz,
  customer_name text,
  customer_phone text
)
language sql
security definer
set search_path = public
as $$
  select r.code, r.status, r.shoot_start, r.customer_name, r.customer_phone
  from public.reservations r
  where r.code = upper(trim(p_code)) and nullif(trim(p_code), '') is not null;
$$;
revoke all on function public.lookup_reservation_by_code(text) from public;
grant execute on function public.lookup_reservation_by_code(text) to anon, authenticated;
