import { createClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/images";

/**
 * 상품 이미지를 Storage에 올리고 저장 경로를 돌려준다 (공개 URL이 아니라
 * 경로만 — lib/images.ts의 publicImageUrl로 필요할 때 URL을 만든다).
 *
 * ImageUploader(대표/예시 사진)와 DescriptionEditor(상세 설명 삽입 이미지)가
 * 이 함수 하나를 같이 쓴다.
 */
export async function uploadProductImage(
  file: File | Blob,
  fileName: string,
): Promise<string> {
  const supabase = createClient();

  // 파일명에 한글이나 공백이 있으면 Storage 경로에서 문제가 되므로
  // 확장자만 남기고 새 이름을 만든다.
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });

  if (error) throw error;
  return path;
}
