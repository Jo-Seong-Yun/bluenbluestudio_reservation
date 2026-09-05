import "server-only";
import { createAdminClient } from "../supabase/admin";

/**
 * 취소 알림 등에 쓸 상품 이름을 상품 공개 여부와 무관하게 가져온다.
 * (조회 시점에 상품이 비공개로 바뀌어 있어도 안내 문구는 계속 나가야 한다)
 */
export async function getProductName(productId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .single();
  return data?.name ?? "촬영";
}
