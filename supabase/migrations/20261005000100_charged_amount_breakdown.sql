-- '실제 지불액'을 기본가/옵션별로 나눠 각각 따로 수정할 수 있게 하기
-- 위해, 그 구성 항목(라벨+금액 배열)을 같이 저장해둔다. charged_amount
-- 컬럼은 그대로 남아 이 항목들의 합계를 담고, 매출관리 계산은 지금처럼
-- charged_amount만 보면 된다 — breakdown은 그 합계를 어떻게 구성했는지
-- 보여주고 다음에 열었을 때 그대로 이어서 고칠 수 있게 하는 용도다.
alter table reservations
  add column charged_amount_breakdown jsonb;
