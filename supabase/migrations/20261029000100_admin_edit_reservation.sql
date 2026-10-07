begin;
-- 예약/답변/희망 시간을 동일 트랜잭션으로 저장. 인증 계정은 관리자만 존재하는 프로젝트 정책.
create or replace function public.admin_edit_reservation(
 p_id uuid, p_expected_updated_at timestamptz, p_record jsonb, p_answers jsonb, p_candidates jsonb
) returns void
language plpgsql security definer set search_path=public as $$
declare old_row public.reservations; new_row public.reservations; item jsonb; buffer_minutes int; old_field_ids uuid[];
begin
 if auth.uid() is null or auth.role() <> 'authenticated' then raise exception '관리자 로그인이 필요합니다.'; end if;
 select * into old_row from public.reservations where id=p_id for update;
 if not found then raise exception '예약을 찾을 수 없습니다.'; end if;
 if old_row.updated_at <> p_expected_updated_at then raise exception '다른 곳에서 수정된 예약입니다. 창을 닫고 다시 열어 주세요.'; end if;
 new_row := jsonb_populate_record(old_row,p_record);
 if new_row.customer_name is null or length(trim(new_row.customer_name))=0 or new_row.customer_phone !~ '^01[0-9]{8,9}$' then raise exception '고객 정보를 확인해 주세요.'; end if;
 if (new_row.shoot_start is null) <> (new_row.shoot_end is null) or new_row.shoot_end <= new_row.shoot_start then raise exception '촬영 일시를 확인해 주세요.'; end if;
 if new_row.status in ('schedule_confirmed','payment_confirmed','completed','no_show') and new_row.shoot_start is null then raise exception '확정 예약의 촬영 일시가 필요합니다.'; end if;
 if new_row.status='cancelled' and coalesce(trim(new_row.cancel_reason),'')='' then raise exception '취소 사유가 필요합니다.'; end if;
 select buffer_after_min into strict buffer_minutes from public.products where id=new_row.product_id;
 -- 허용한 운영 항목만 업데이트. id/캘린더 이벤트 id 등 내부 연동값은 보호.
 update public.reservations set
 code=new_row.code,product_id=new_row.product_id,status=new_row.status,
 customer_name=new_row.customer_name,customer_phone=new_row.customer_phone,customer_email=new_row.customer_email,
 gender=new_row.gender,birth_date=new_row.birth_date,people_count=new_row.people_count,
 shoot_start=new_row.shoot_start,shoot_end=new_row.shoot_end,
 period=case when new_row.shoot_start is null then null else tstzrange(new_row.shoot_start,new_row.shoot_end+make_interval(mins=>buffer_minutes),'[)') end,
 confirmed_candidate_rank=new_row.confirmed_candidate_rank,
 memo=new_row.memo,admin_memo=new_row.admin_memo,shoot_location=new_row.shoot_location,
 cancel_reason=new_row.cancel_reason,
 status_before_cancel=case when new_row.status='cancelled' and old_row.status<>'cancelled' then old_row.status when new_row.status<>'cancelled' then null else old_row.status_before_cancel end,
 cost=new_row.cost,cost_memo=new_row.cost_memo,charged_amount=new_row.charged_amount,
 charged_amount_memo=new_row.charged_amount_memo,charged_amount_breakdown=new_row.charged_amount_breakdown,
 estimated_amount=new_row.estimated_amount,team_emails=new_row.team_emails,ref=new_row.ref,
 created_at=new_row.created_at,deliverable_sent_at=new_row.deliverable_sent_at,reminded_at=new_row.reminded_at,updated_at=clock_timestamp()
 where id=p_id;
 select coalesce(array_agg(field_id),array[]::uuid[]) into old_field_ids from public.reservation_answers where reservation_id=p_id;
 delete from public.reservation_answers where reservation_id=p_id;
 for item in select value from jsonb_array_elements(p_answers) loop
  if not exists(select 1 from public.custom_fields where id=(item->>'field_id')::uuid and (product_id=new_row.product_id or product_id is null or id = any(old_field_ids))) then raise exception '문항을 찾을 수 없습니다.'; end if;
  insert into public.reservation_answers(reservation_id,field_id,value) values(p_id,(item->>'field_id')::uuid,item->>'value');
 end loop;
 delete from public.reservation_candidates where reservation_id=p_id;
 for item in select value from jsonb_array_elements(p_candidates) loop
  insert into public.reservation_candidates(reservation_id,rank,shoot_start,shoot_end,period)
  values(p_id,(item->>'rank')::int,(item->>'shoot_start')::timestamptz,(item->>'shoot_end')::timestamptz,
   tstzrange((item->>'shoot_start')::timestamptz,(item->>'shoot_end')::timestamptz+make_interval(mins=>buffer_minutes),'[)'));
 end loop;
 insert into public.customers(phone,name,gender,birth_date,email)
 values(new_row.customer_phone,new_row.customer_name,new_row.gender,new_row.birth_date,new_row.customer_email)
 on conflict(phone) do update set name=excluded.name,gender=excluded.gender,birth_date=excluded.birth_date,email=excluded.email;
end;
$$;
revoke all on function public.admin_edit_reservation(uuid,timestamptz,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.admin_edit_reservation(uuid,timestamptz,jsonb,jsonb,jsonb) to authenticated;
commit;
