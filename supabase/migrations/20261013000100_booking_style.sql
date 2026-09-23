-- 예약 화면(/booking) 디자인 커스터마이징. 강조색/세일 배지 색/텍스트
-- 색상·크기/카드 모서리·크기를 관리자가 직접 고를 수 있다. 실제 값의
-- 뜻과 기본값은 lib/booking-style.ts(BookingStyle)가 정한다 — 여기
-- 기본값은 그 파일의 DEFAULT_BOOKING_STYLE과 반드시 같아야 한다.
alter table settings
  add column booking_style jsonb not null default '{
    "accentColor": "#3d6fe0",
    "saleColor": "#e11d48",
    "textColor": "#0b1b2b",
    "textSize": "md",
    "cardRadius": "xl",
    "cardSize": "standard"
  }'::jsonb;
