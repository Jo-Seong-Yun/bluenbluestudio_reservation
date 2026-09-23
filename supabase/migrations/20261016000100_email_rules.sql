-- 이메일 발송을 관리자가 완전히 다루는 "규칙" 시스템으로 바꾼다.
-- 지금까지는 이메일 종류(purpose)가 6개로 코드에 고정돼 있었는데,
-- 이제는 관리자가 규칙(이름·트리거 조건·수신자·제목·본문)을
-- /admin/emails에서 자유롭게 추가·수정·삭제할 수 있다.
--
-- 트리거는 실제로 코드가 이메일을 보낼 수 있는 지점(예약 접수/확정/
-- 취소/일정변경/관리자 신규알림) 더하기, 촬영일 기준 며칠 전/후
-- (day_offset)까지 지원한다 — 후자는 app/api/cron/reminders/route.ts가
-- 매일 훑어 발송한다. 상품 필터(product_id)가 없으면(null) 전체
-- 상품에 적용된다.
--
-- 변수({{이름}} 등)는 이제 모든 규칙에 공통으로 쓸 수 있다
-- (lib/notifications/email-rules-shared.ts의 EMAIL_VARIABLES) — 그
-- 발송 시점에 값이 없는 변수를 써도 빈 문자열로 채워질 뿐 오류가
-- 나지 않는다.
create table email_rules (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  enabled      boolean not null default true,
  recipient    text not null default 'customer' check (recipient in ('customer', 'admin')),
  trigger_type text not null check (trigger_type in (
    'on_requested', 'on_confirmed', 'on_cancelled', 'on_rescheduled',
    'on_admin_new_request', 'days_before_shoot', 'days_after_shoot'
  )),
  day_offset   integer,
  product_id   uuid references products(id) on delete set null,
  subject      text not null,
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint email_rules_day_offset_check check (
    (
      trigger_type in ('days_before_shoot', 'days_after_shoot')
      and day_offset is not null and day_offset >= 1
    )
    or (
      trigger_type not in ('days_before_shoot', 'days_after_shoot')
      and day_offset is null
    )
  )
);

create trigger email_rules_set_updated_at
  before update on email_rules
  for each row execute function set_updated_at();

alter table email_rules enable row level security;

create policy "관리자만 이메일 규칙 조회"
  on email_rules for select
  to authenticated
  using (true);

create policy "관리자만 이메일 규칙 추가"
  on email_rules for insert
  to authenticated
  with check (true);

create policy "관리자만 이메일 규칙 수정"
  on email_rules for update
  to authenticated
  using (true)
  with check (true);

create policy "관리자만 이메일 규칙 삭제"
  on email_rules for delete
  to authenticated
  using (true);

-- 기존 email_templates에 관리자가 직접 고쳐둔 문구가 있으면 그대로
-- 옮긴다 — 이관 전후로 실제 발송 문구가 바뀌지 않게 하기 위해서다.
insert into email_rules (name, recipient, trigger_type, day_offset, subject, body)
select
  case purpose
    when 'customer_requested' then '손님 — 예약 접수'
    when 'customer_confirmed' then '손님 — 예약 확정'
    when 'customer_cancelled' then '손님 — 예약 취소'
    when 'customer_reminder' then '손님 — 촬영 전날 리마인드'
    when 'customer_rescheduled' then '손님 — 예약 일정 변경'
    when 'admin_new_request' then '사장님 — 새 예약 신청'
  end,
  case when purpose = 'admin_new_request' then 'admin' else 'customer' end,
  case purpose
    when 'customer_requested' then 'on_requested'
    when 'customer_confirmed' then 'on_confirmed'
    when 'customer_cancelled' then 'on_cancelled'
    when 'customer_reminder' then 'days_before_shoot'
    when 'customer_rescheduled' then 'on_rescheduled'
    when 'admin_new_request' then 'on_admin_new_request'
  end,
  case when purpose = 'customer_reminder' then 1 else null end,
  subject,
  body
from email_templates
where purpose in (
  'customer_requested', 'customer_confirmed', 'customer_cancelled',
  'customer_reminder', 'customer_rescheduled', 'admin_new_request'
);

-- 한 번도 관리자가 고친 적 없는(=email_templates에 행이 없는) 목적은
-- 예전 하드코딩 기본 문구로 규칙을 채운다.
insert into email_rules (name, recipient, trigger_type, day_offset, subject, body)
select v.name, v.recipient, v.trigger_type, v.day_offset, v.subject, v.body
from (
  values
    (
      'customer_requested', '손님 — 예약 접수', 'customer', 'on_requested', null::integer,
      '[푸르른 스튜디오] 예약 신청이 접수되었습니다',
      '{{상품명}} 예약 신청이 접수되었습니다.

희망 시간(이 중 하나로 확정됩니다):
{{후보목록}}

예약번호: {{예약번호}}

예약 내역은 입력하신 연락처로 조회할 수 있으며, 신청하신 희망 시간 중 하나로 확정해드리면 아래 계좌로 예약금을 입금해 주세요.

입금 계좌: {{계좌}}

{{공지}}'
    ),
    (
      'customer_confirmed', '손님 — 예약 확정', 'customer', 'on_confirmed', null,
      '[푸르른 스튜디오] 예약이 확정되었습니다',
      '{{이름}}님, 예약이 확정되었습니다.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}

촬영 전날 다시 안내드리겠습니다.'
    ),
    (
      'customer_cancelled', '손님 — 예약 취소', 'customer', 'on_cancelled', null,
      '[푸르른 스튜디오] 예약이 취소되었습니다',
      '{{이름}}님, 예약이 취소되었습니다.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}'
    ),
    (
      'customer_reminder', '손님 — 촬영 전날 리마인드', 'customer', 'days_before_shoot', 1,
      '[푸르른 스튜디오] 내일 촬영 예약 안내',
      '{{이름}}님, 내일 촬영 예약 안내입니다.

상품: {{상품명}}
일시: {{일시}}
장소: {{촬영장소}}
예약번호: {{예약번호}}

늦지 않게 와주시기 바랍니다.'
    ),
    (
      'customer_rescheduled', '손님 — 예약 일정 변경', 'customer', 'on_rescheduled', null,
      '[푸르른 스튜디오] 예약 일정이 변경되었습니다',
      '{{이름}}님, 예약 일정이 변경되었습니다.

상품: {{상품명}}
기존 일시: {{기존일시}}
변경된 일시: {{변경일시}}
예약번호: {{예약번호}}'
    ),
    (
      'admin_new_request', '사장님 — 새 예약 신청', 'admin', 'on_admin_new_request', null,
      '[푸르른 스튜디오] 새 예약 신청이 들어왔습니다',
      '새 예약 신청이 들어왔습니다.

상품: {{상품명}}
희망 시간:
{{후보목록}}

신청자: {{이름}} ({{연락처}})
예약번호: {{예약번호}}'
    )
) as v(purpose, name, recipient, trigger_type, day_offset, subject, body)
where not exists (
  select 1 from email_templates et where et.purpose = v.purpose
);

-- 이제 이메일 발송은 전부 email_rules를 거치므로 예전 표는 정리한다.
drop table email_templates;
