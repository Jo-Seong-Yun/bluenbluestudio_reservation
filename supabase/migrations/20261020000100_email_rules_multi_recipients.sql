-- 이메일 규칙의 받는 사람을 여러 명(손님+사장님) 고를 수 있게 한다.
-- 지금까지는 recipient 하나(customer/admin)만 둘 수 있어서, 같은 내용을
-- 둘 다에게 보내려면 규칙을 두 개 만들어야 했다.
alter table email_rules
  add column recipients text[] not null default array['customer']::text[];

-- 기존 규칙은 지금 받는 사람 한 명을 그대로 옮긴다.
update email_rules set recipients = array[recipient];

alter table email_rules
  add constraint email_rules_recipients_check
  check (
    cardinality(recipients) > 0
    and recipients <@ array['customer', 'admin']::text[]
  );

alter table email_rules drop column recipient;
