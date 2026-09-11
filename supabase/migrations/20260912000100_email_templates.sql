-- 이메일 문구를 관리자가 /admin/settings에서 직접 편집할 수 있게 한다.
-- 지금까지는 lib/notifications/templates.ts에 하드코딩돼 있었다 — 그
-- 문구들을 이 표의 기본값으로 옮기고, 발송 시점에 이 표를 먼저 확인한다
-- (행이 없으면 코드에 남아있는 기본 문구로 조용히 되돌아간다 — 안전망).
--
-- subject/body 안의 {{변수명}} 자리표시자는 발송 직전에 실제 값으로
-- 치환된다(lib/notifications/email-templates-shared.ts의
-- renderEmailTemplate). 어떤 변수를 쓸 수 있는지는 같은 파일의
-- EMAIL_TEMPLATE_VARIABLES가 정의한다.
create table email_templates (
  purpose    text primary key check (purpose in (
    'customer_requested', 'customer_confirmed', 'customer_cancelled',
    'customer_reminder', 'admin_new_request'
  )),
  subject    text not null,
  body       text not null,
  updated_at timestamptz not null default now()
);

create trigger email_templates_set_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

alter table email_templates enable row level security;

-- 손님 예약 흐름(anon)도 접수 직후 이 표를 읽어 이메일을 보낸다
-- (createReservation → notifyCustomerRequested). settings 테이블(계좌
-- 번호·공지 등)과 같은 패턴으로 조회는 공개한다.
create policy "누구나 이메일 문구 조회"
  on email_templates for select
  to anon, authenticated
  using (true);

create policy "관리자만 이메일 문구 수정"
  on email_templates for update
  to authenticated
  using (true)
  with check (true);

insert into email_templates (purpose, subject, body) values
(
  'customer_requested',
  '[푸르른 스튜디오] 예약 신청이 접수됐어요',
  '{{상품명}} 예약 신청이 접수되었습니다.

희망 시간(이 중 하나로 확정돼요):
{{후보목록}}

예약번호: {{예약번호}}

예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을 입금하시면 예약이 최종 확정됩니다.

입금 계좌: {{계좌}}

{{공지}}'
),
(
  'customer_confirmed',
  '[푸르른 스튜디오] 예약이 확정됐어요',
  '{{이름}}님, 예약이 확정됐어요.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}

촬영 전날 다시 안내드릴게요.'
),
(
  'customer_cancelled',
  '[푸르른 스튜디오] 예약이 취소됐어요',
  '{{이름}}님, 예약이 취소됐어요.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}'
),
(
  'customer_reminder',
  '[푸르른 스튜디오] 내일 촬영 예약 안내',
  '{{이름}}님, 내일 촬영 예약 안내예요.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}

늦지 않게 와주세요!'
),
(
  'admin_new_request',
  '[푸르른 스튜디오] 새 예약 신청이 들어왔어요',
  '새 예약 신청이 들어왔어요.

상품: {{상품명}}
희망 시간:
{{후보목록}}

신청자: {{이름}} ({{연락처}})
예약번호: {{예약번호}}'
);
