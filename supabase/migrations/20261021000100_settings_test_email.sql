-- 이메일 규칙을 실제 손님에게 보내기 전에 미리 확인해볼 "테스트 발송
-- 주소". /admin/emails 상단에서 저장하고, 각 규칙의 "테스트 발송"
-- 버튼이 이 주소로 예시 값이 채워진 메일을 보낸다.
alter table settings add column test_email text;
