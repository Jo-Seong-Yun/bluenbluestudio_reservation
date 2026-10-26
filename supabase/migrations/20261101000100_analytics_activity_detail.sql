-- 기존 로그를 보존합니다. SQL Editor 실행 확인 후 앱을 배포합니다.
begin;
alter table public.booking_events add column if not exists event_details jsonb not null default '{}'::jsonb;
alter table public.booking_events drop constraint if exists booking_events_event_kind_check;
alter table public.booking_events add constraint booking_events_event_kind_check check(event_kind in (
'list_view','detail_view','times_view','form_view','review_view','completed','field_view','field_valid','field_invalid','field_error','submit_attempt','submit_error',
'month_change','slots_error','field_focus','date_select','time_select','time_remove','times_continue','page_view','page_next','page_back','field_change','option_select','option_deselect','form_restore','visibility_change'));
create index if not exists booking_events_timeline_index on public.booking_events(occurred_at desc,id desc);
create index if not exists booking_events_session_timeline_index on public.booking_events(session_id,occurred_at desc,id desc);
create index if not exists booking_events_product_timeline_index on public.booking_events(product_id,occurred_at desc,id desc);
create index if not exists booking_events_attempt_timeline_index on public.booking_events(attempt_id,occurred_at desc,id desc);
-- 새 복합 인덱스가 동일한 선두 컬럼 조회를 지원하므로 중복 단일 인덱스 제거.
drop index if exists public.booking_events_time_index;
drop index if exists public.booking_events_attempt_index;
create index if not exists booking_events_summary_index on public.booking_events(id) where event_kind in ('list_view','detail_view','times_view','form_view','review_view','completed','field_view','field_valid','field_invalid','field_error','submit_attempt','submit_error');
commit;
