-- 상품별 태그 색상.
--
-- 자유 입력 색상이 아니라 미리 정해둔 10가지 파스텔 팔레트 중 하나만
-- 고를 수 있다 — lib/product-tag-colors.ts의 팔레트와 이 목록은 항상
-- 같아야 한다. null이면 태그 색상 없음(회색 점으로도 안 보여줌).
alter table products
  add column tag_color text
  check (tag_color is null or tag_color in (
    'rose', 'orange', 'amber', 'lime', 'emerald',
    'teal', 'sky', 'indigo', 'violet', 'pink'
  ));
