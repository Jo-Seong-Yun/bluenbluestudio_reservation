-- 상품 할인가. price(정가)는 그대로 두고, 할인 판매 중인 상품만
-- sale_price를 채운다 — 비어 있으면(null) 손님 화면에 정가만 보인다.
-- 정가보다 낮을 때만 의미가 있으므로 체크 제약으로 강제한다.
alter table products
  add column sale_price integer
  check (sale_price is null or (sale_price >= 0 and sale_price < price));
