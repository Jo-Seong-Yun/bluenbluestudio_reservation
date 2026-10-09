-- 선택지와 동일한 인덱스로 보조 설명을 저장합니다. 기존 문항/보기/가격은 보존합니다.
alter table public.custom_fields
  add column if not exists option_descriptions text[];
comment on column public.custom_fields.option_descriptions
  is 'options와 동일한 순서의 선택지별 일반 텍스트 설명';
