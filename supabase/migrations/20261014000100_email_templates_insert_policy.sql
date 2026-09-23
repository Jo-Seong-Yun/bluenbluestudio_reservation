-- 이메일 문구 저장(saveEmailTemplate)이 upsert를 쓰는데, email_templates에
-- update 정책만 있고 insert 정책이 없었다 — upsert는 SQL상 INSERT문이라
-- (ON CONFLICT DO UPDATE로 끝나더라도) RLS가 insert 정책을 요구한다.
-- "new row violates row-level security policy for table email_templates"
-- 에러가 이 정책 누락 때문에 났다.
create policy "관리자만 이메일 문구 추가"
  on email_templates for insert
  to authenticated
  with check (true);
