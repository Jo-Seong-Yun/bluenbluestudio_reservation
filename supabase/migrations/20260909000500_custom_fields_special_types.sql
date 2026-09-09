-- 이름·연락처·이메일·성별·생년월일을 더 이상 신청서 코드에 박아두지
-- 않고, custom_fields로 옮긴다. 상품을 만들면 이 5개가 문항편집 화면에
-- 기본으로 생겨 있고, 관리자가 자유롭게 라벨을 바꾸거나 지울 수 있다
-- (지우면 그 상품 신청서에서 그 항목을 아예 안 받는다 — 연락처를 지우면
-- 전화번호로 예약 조회가 안 되는 식으로, 결과는 관리자 책임이다).
--
-- 답변 저장 위치는 그대로다: 이 5개 타입의 답변은 지금처럼
-- reservations.customer_name/customer_phone/customer_email/gender/
-- birth_date 컬럼에 들어간다(lookup·나이 계산·알림 발송이 그 컬럼을
-- 그대로 쓰기 때문). reservation_answers로 가는 건 그 외의 일반 문항
-- (인원·요청사항 포함, 이제 이것도 일반 문항이다)뿐이다.
alter table custom_fields drop constraint custom_fields_type_check;
alter table custom_fields add constraint custom_fields_type_check check (
  type in (
    'short_text', 'long_text', 'single_choice', 'multi_choice', 'checkbox',
    'name', 'phone', 'email', 'gender', 'birth_date'
  )
);

-- 이미 있는 상품들에도 5개를 소급 적용한다. sort_order를 음수로 줘서
-- 그 상품에 이미 있던 문항들(0부터 시작) 맨 앞에 오도록 하고, 기존
-- 문항들의 순서는 건드리지 않는다.
insert into custom_fields (product_id, label, type, required, sort_order, active)
select p.id, v.label, v.type, v.required, v.sort_order, true
from products p
cross join (
  values
    ('이름', 'name', true, -5),
    ('연락처', 'phone', true, -4),
    ('이메일', 'email', false, -3),
    ('성별', 'gender', true, -2),
    ('생년월일', 'birth_date', true, -1)
) as v(label, type, required, sort_order)
where not exists (
  select 1 from custom_fields cf
  where cf.product_id = p.id and cf.type = v.type
);
