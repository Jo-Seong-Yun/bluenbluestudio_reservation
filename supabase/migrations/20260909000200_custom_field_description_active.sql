-- 커스텀 문항 개선: 설명 텍스트 + 활성화 토글.
--
-- "되는시간" 같은 예약 서비스의 문항 편집기를 참고해서 두 가지를 더한다.
--   1) description: 질문 아래 작게 보여줄 부가 설명(선택 입력)
--   2) active: 문항을 삭제하지 않고 껐다 켤 수 있게. 꺼두면 손님 폼에는
--      안 보이지만, 이미 받은 답변(reservation_answers)은 그대로 남는다
--      — 잠깐 안 쓰는 문항이라고 답변 기록까지 지울 이유는 없다.
alter table custom_fields
  add column description text,
  add column active boolean not null default true;
