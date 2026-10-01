-- 예약자 외에 같은 메일을 따로 받을 팀원 이메일 목록. 관리자가 발송
-- 확인창에서 적은 주소가 저장되고, 다음 확인창과 자동 메일(리마인드 등)에서도
-- 손님용 메일을 이 주소들에게 각각 따로 보낸다.
alter table reservations
  add column if not exists team_emails text[] not null default '{}';
