-- 예약 화면(/booking) 꾸미기 기능. 관리자가 미리 만들어둔 테마(색상·
-- 카드 모양 조합) 중 하나를 고르고, 소셜 링크를 몇 개 등록할 수 있다.
-- 테마 자체의 실제 색상 값은 코드(lib/booking-theme.ts)에 있고, 여기엔
-- 어떤 테마를 골랐는지(id)와 소셜 링크 목록만 저장한다.
alter table settings
  add column booking_theme text not null default 'blue';

alter table settings
  add constraint settings_booking_theme_check
  check (booking_theme in ('blue', 'cream', 'dark'));

-- [{ "label": "인스타그램", "url": "https://instagram.com/..." }, ...] 형태.
-- 빈 배열이면 소셜 아이콘 줄 자체를 안 보여준다.
alter table settings
  add column booking_social_links jsonb not null default '[]'::jsonb;
