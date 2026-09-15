-- 상품 태그 색상 팔레트를 구글 캘린더의 11색(colorId 1~11)과 똑같이
-- 맞춘다 — lib/product-tag-colors.ts 참고. 기존 값은 이전에 구글
-- 캘린더 동기화용으로 이미 정해뒀던 최단거리 짝(lib/product-tag-colors.ts의
-- 옛 GOOGLE_CALENDAR_COLOR_ID)을 그대로 새 키로 옮긴다.
alter table products drop constraint products_tag_color_check;

update products
set tag_color = case tag_color
  when 'sky' then 'lavender'
  when 'lime' then 'sage'
  when 'violet' then 'grape'
  when 'pink' then 'flamingo'
  when 'amber' then 'banana'
  when 'orange' then 'tangerine'
  when 'teal' then 'peacock'
  when 'indigo' then 'blueberry'
  when 'emerald' then 'basil'
  when 'rose' then 'tomato'
  else tag_color
end
where tag_color is not null;

alter table products
  add constraint products_tag_color_check
  check (tag_color is null or tag_color in (
    'lavender', 'sage', 'grape', 'flamingo', 'banana',
    'tangerine', 'peacock', 'graphite', 'blueberry', 'basil', 'tomato'
  ));
