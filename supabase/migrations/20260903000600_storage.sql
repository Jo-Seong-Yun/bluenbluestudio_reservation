-- 상품 이미지 저장용 버킷.
-- 대표 이미지/갤러리는 공개로 보여줘야 하므로 버킷 자체는 public.
-- 업로드/수정/삭제는 관리자만.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "상품 이미지 공개 조회"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "관리자만 상품 이미지 업로드"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "관리자만 상품 이미지 수정"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

create policy "관리자만 상품 이미지 삭제"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
