begin;
-- Existing reservations remain ON. New reservations capture the current setting atomically.
alter table public.reservations add column if not exists deposit_required boolean not null default true;
create or replace function public.snapshot_reservation_deposit_mode()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if TG_OP='UPDATE' then
    new.deposit_required := old.deposit_required;
  else
    select case when jsonb_typeof(booking_style->'depositEnabled')='boolean'
      then (booking_style->>'depositEnabled')::boolean else true end
    into new.deposit_required from public.settings where id=1;
    new.deposit_required := coalesce(new.deposit_required,true);
  end if;
  return new;
end;
$$;
revoke all on function public.snapshot_reservation_deposit_mode() from public, anon, authenticated;
drop trigger if exists snapshot_reservation_deposit_mode on public.reservations;
create trigger snapshot_reservation_deposit_mode before insert or update on public.reservations
for each row execute function public.snapshot_reservation_deposit_mode();
-- Same booking-code access boundary as the existing code lookup; exposes only the mode.
create or replace function public.lookup_reservation_deposit_mode(p_code text)
returns boolean language sql security definer set search_path=public as $$
 select deposit_required from public.reservations
 where code=upper(trim(p_code)) and nullif(trim(p_code),'') is not null;
$$;
revoke all on function public.lookup_reservation_deposit_mode(text) from public;
grant execute on function public.lookup_reservation_deposit_mode(text) to anon, authenticated;
commit;
