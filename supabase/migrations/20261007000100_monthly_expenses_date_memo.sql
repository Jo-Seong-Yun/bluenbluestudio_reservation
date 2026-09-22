-- 매출관리의 "고정비"를 "기타지출"로 부르고, 일자·비고를 항목별로
-- 남길 수 있게 한다. 기존 month(YYYY-MM)는 그대로 두고 조회에 계속
-- 쓰되, 이제부턴 새로 입력하는 일자(date)에서 그 값을 계산해 넣는다
-- (app/admin/actions.ts의 addMonthlyExpense).
alter table monthly_expenses
  add column date date,
  add column memo text;
