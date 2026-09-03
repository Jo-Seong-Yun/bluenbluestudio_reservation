-- 이중예약 방지(EXCLUDE 제약)에 필요한 확장.
-- gist 인덱스에 등호(=) 비교를 쓸 수 있게 해준다.
create extension if not exists btree_gist;

-- 공통으로 쓰는 updated_at 자동 갱신 트리거 함수.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
