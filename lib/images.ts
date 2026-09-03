import { supabaseUrl } from "./supabase/env";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/**
 * Storage에 저장한 경로를 실제로 보이는 주소로 바꾼다.
 *
 * DB에는 경로만 저장한다(예: "a1b2....jpg"). 공개 버킷이라 URL 규칙이
 * 정해져 있어 조합만 하면 되고, 매번 Supabase에 물어볼 필요가 없다.
 */
export function publicImageUrl(path: string): string {
  return `${supabaseUrl()}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`;
}
