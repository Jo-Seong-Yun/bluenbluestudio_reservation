-- 커스텀 문항을 상품별로 분리.
--
-- 지금까지는 문항이 전체 상품 공통이었는데, 상품마다 서로 다른 추가
-- 질문이 필요해서(예: A 상품엔 "선호하는 컨셉", B 상품엔 "촬영 인원
-- 관계") product_id로 나눈다. 순서(sort_order)도 이제 상품별로 각각
-- 매긴다.
alter table custom_fields
  add column product_id uuid references products(id) on delete cascade;

create index custom_fields_product_id_idx on custom_fields(product_id);
