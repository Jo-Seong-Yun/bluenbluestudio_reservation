-- 촬영 후 손님에게 받는 "촬영 기록표" 서명지를 예약 정보로 자동 채우기
-- 위해 필요한 항목들을 마련한다.

-- 상품마다 다른 "완성본 전달예정일" 문구(예: "7일"). 손님에게 묻는 게
-- 아니라 사장님이 상품 수정 화면에서 미리 정해두는 값이라 custom_fields가
-- 아니라 products에 둔다.
alter table products
  add column delivery_note text;

-- 신청자(보호자/팀원 등 대표 예약자) 정보 5문항 + SNS 게시 동의 1문항을
-- 기존 상품 전부에 추가한다. 신청자 정보는 배우가 미성년자이거나 대표
-- 예약인 경우에만 쓰는 칸이라 필수가 아니고, SNS 동의만 필수다. 새로
-- 만드는 상품은 DEFAULT_CUSTOM_FIELDS(app/admin/actions.ts)가 앞으로
-- 자동으로 넣어준다 — 여기서는 이미 있는 상품들만 채워준다.
insert into custom_fields (product_id, label, type, required, options, sort_order)
select
  p.id,
  f.label,
  f.type,
  f.required,
  f.options,
  coalesce((select max(c.sort_order) from custom_fields c where c.product_id = p.id), -1) + 1 + f.ord
from products p
cross join (
  values
    ('신청자 성명', 'short_text', false, null::jsonb, 0),
    ('신청자 생년월일', 'short_text', false, null::jsonb, 1),
    ('신청자 성별', 'single_choice', false, '["남성", "여성"]'::jsonb, 2),
    ('신청자 연락처', 'short_text', false, null::jsonb, 3),
    ('신청자와의 관계', 'single_choice', false, '["보호자", "팀원", "기타"]'::jsonb, 4),
    ('완성본의 ''푸르른 스튜디오'' 인스타그램 게시', 'single_choice', true, '["동의", "비동의"]'::jsonb, 5)
) as f(label, type, required, options, ord);
