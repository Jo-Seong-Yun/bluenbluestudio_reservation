-- 이메일 규칙 목록 순서를 관리자가 직접 정하고 고정할 수 있게 한다.
-- 지금까지는 created_at 순으로만 보여줘서, 수정해도 순서 자체는 안
-- 바뀌어야 정상인데 새 규칙을 추가하거나 하면 체감상 순서가 뒤섞여
-- 보이는 문제가 있었다 — sort_order를 따로 둬서 이 값으로만 정렬한다
-- (신청서 문항의 custom_fields.sort_order와 같은 방식).
alter table email_rules add column sort_order integer not null default 0;

-- 기존 행은 지금까지 보이던 순서(created_at 오름차순)를 그대로
-- sort_order로 옮겨, 이 마이그레이션 적용 전후로 화면에 보이는 순서가
-- 안 바뀌게 한다.
update email_rules
set sort_order = t.rn - 1
from (
  select id, row_number() over (order by created_at) as rn
  from email_rules
) as t
where email_rules.id = t.id;
