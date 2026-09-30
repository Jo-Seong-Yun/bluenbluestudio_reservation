-- 상품 목록 카드의 요약(summary)과 별개로, 상품 페이지에서 상품명 아래에
-- 보여줄 소개 문구.
alter table products
  add column if not exists page_summary text;
