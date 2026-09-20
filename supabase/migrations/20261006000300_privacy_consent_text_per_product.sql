-- 개인정보 동의 문구를 전체 상품 공통(settings)이 아니라 상품마다
-- 따로 쓸 수 있게 옮긴다 — 상품마다 촬영 성격이 달라 동의 문구도
-- 다를 수 있어서다. settings 쪽 컬럼(20261006000200)은 실제로 쓰인 적
-- 없으니 그냥 지운다.
--
-- products에 기본값을 넣어두면(DEFAULT 절) 기존 상품뿐 아니라 앞으로
-- 새로 만드는 상품에도 자동으로 채워진다 — 개인정보 수집 안내라 공백
-- 상태로 새 상품이 만들어지는 것보다 일단 채워두는 쪽이 안전하고,
-- 필요 없으면 상품 수정 화면에서 비우면 된다.
alter table settings drop column if exists privacy_consent_text;

alter table products
  add column privacy_consent_text text default '예약 확인을 위해 위 정보를 수집합니다. 촬영일로부터 1년간 보관 후 삭제하며, 예약 외 다른 목적으로 쓰지 않습니다.';
