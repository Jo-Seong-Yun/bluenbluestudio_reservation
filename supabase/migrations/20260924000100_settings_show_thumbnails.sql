-- 상품 목록(/booking) 화면의 썸네일 표시 여부를 관리자가 켜고 끌 수
-- 있게 한다. 기본은 켜짐(지금까지의 동작 그대로) — 새로 배포됐을 때
-- 갑자기 썸네일이 사라지지 않도록.
alter table settings
  add column show_product_thumbnails boolean not null default true;
