-- "기타지출" 아래에 같은 구성의 "고정지출"을 추가한다. 두 쪽 다
-- 일자·항목·금액·비고 네 칸으로 완전히 같은 모양이라, 테이블을
-- 새로 만들지 않고 monthly_expenses에 구분 칸(kind)만 하나 더 둔다.
-- 기존 행은 전부 "기타지출"이었으므로 기본값을 'other'로 채운다.
alter table monthly_expenses
  add column kind text not null default 'other'
    check (kind in ('other', 'fixed'));
