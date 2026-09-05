-- Phase 8: 알림. 손님에게 접수/확정/취소를 SMS(솔라피)로, 사장님에게 새
-- 예약 신청을 SMS/이메일(Resend)로 즉시 알린다. 촬영 전날 리마인드는
-- Vercel Cron이 reminded_at을 보고 중복 발송 없이 하루 한 번 돈다.

alter table settings
  add column admin_notify_phone text,  -- 새 예약 SMS를 받을 사장님 번호
  add column admin_notify_email text;  -- 새 예약 이메일을 받을 사장님 메일

alter table reservations
  add column reminded_at timestamptz;  -- 전날 리마인드 발송 시각 (중복 발송 방지)

-- 발송 성공/실패 기록. 손님 예약 흐름·관리자 화면 양쪽에서 남기지만,
-- 둘 다 서버 액션 안에서 서비스 역할 키(createAdminClient)로만 쓴다 —
-- RLS를 우회하는 김에 다른 정책 없이 조회만 관리자에게 열어둔다.
create table notification_logs (
  id             uuid primary key default gen_random_uuid(),
  channel        text not null check (channel in ('sms', 'email')),
  purpose        text not null,   -- 'customer_requested' 등 어떤 알림인지
  recipient      text not null,
  reservation_id uuid references reservations(id) on delete set null,
  success        boolean not null,
  error          text,
  created_at     timestamptz not null default now()
);

alter table notification_logs enable row level security;

create policy "관리자만 발송 로그 조회"
  on notification_logs for select
  to authenticated
  using (true);
