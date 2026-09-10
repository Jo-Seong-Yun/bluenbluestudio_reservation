import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createDraftProduct } from "@/app/admin/actions";
import { ErrorText } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ProductGrid } from "./product-grid";

export const metadata: Metadata = { title: "상품관리" };

export default async function ProductsPage() {
  // 로그인 확인은 app/admin/(dashboard)/layout.tsx 가 이미 한다.
  // 여기서 또 하면 Supabase 인증 서버를 왕복 호출을 한 번 더 하게 되어
  // 화면마다 그만큼 느려진다.

  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, duration_min, is_published, sort_order, tag_color",
    )
    .order("sort_order")
    .order("created_at");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="border-b-2 border-gray-900 bg-gradient-to-br from-gray-100 to-white px-8 py-12">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-8">
          <div>
            <h1 className="text-6xl sm:text-7xl font-black uppercase tracking-tighter text-gray-900 leading-none mb-2">
              상품관리
            </h1>
            <p className="text-sm font-mono uppercase tracking-widest text-gray-700 mt-4">
              ▼ 총 <span className="font-bold">{products?.length ?? 0}</span> 개 상품
            </p>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed max-w-md">
              고객이 예약할 수 있는 촬영 서비스를 관리합니다. 정렬 순서는 예약 페이지와 동일합니다.
            </p>
          </div>

          {/* 상품 추가 버튼 */}
          <form action={createDraftProduct}>
            <SubmitButton className="px-8 py-4 bg-gray-900 text-white border-2 border-gray-900 font-black uppercase tracking-wider text-sm hover:bg-white hover:text-gray-900 transition-all duration-200">
              ➕ 상품 추가
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* 에러 표시 */}
      {error ? (
        <div className="bg-red-100 border-l-4 border-red-900 px-6 py-4 mx-8 mt-8">
          <p className="text-red-900 font-bold text-sm uppercase tracking-wider">
            ⚠ ERROR
          </p>
          <p className="text-red-800 text-sm mt-1 font-mono">
            불러오지 못했습니다: {error.message}
          </p>
        </div>
      ) : null}

      {/* 상품 그리드 */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <ProductGrid products={products ?? []} />
        </div>
      </div>
    </div>
  );
}
