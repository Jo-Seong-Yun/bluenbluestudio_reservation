-- 개인정보 동의 문구를 products.privacy_consent_text라는 별도 칸으로
-- 만들었었는데, 그 결과 신청서 맨 아래에 지울 수 없는 고정 체크박스가
-- 하나 더 남아버렸다. 이 동의는 이제 그냥 신청서 문항(custom_fields,
-- type="checkbox")으로 직접 관리한다 — 이미 있는 문항편집 화면에서
-- 자유롭게 문구를 쓰고, 추가/삭제/순서변경까지 다 되는 게 더 낫다.
-- 그래서 이 전용 칸 자체를 없앤다.
alter table products drop column if exists privacy_consent_text;
alter table settings drop column if exists privacy_consent_text;
