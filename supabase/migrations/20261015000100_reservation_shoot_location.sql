-- 예약별 촬영 장소. 관리자가 예약 상세에서 직접 입력하고("사장님 메모"와
-- 같은 방식), 촬영 전날 리마인드 이메일의 {{촬영장소}} 변수가 이 값을
-- 그대로 쓴다(lib/notifications/templates.ts의 reservationEmailVariables).
alter table reservations
  add column shoot_location text;
