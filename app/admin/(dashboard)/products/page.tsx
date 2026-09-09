import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, ErrorText } from "@/components/ui";
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
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">상품관리</h1>
          <p className="text-muted mt-1 text-sm">
            고객이 예약할 수 있는 촬영 상품 (순서는 예약화면의 순서와 동일함)
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>상품 추가</Button>
        </Link>
      </div>

      {error ? (
        <ErrorText>불러오지 못했습니다: {error.message}</ErrorText>
      ) : null}

      {products && products.length === 0 ? (
        <div className="border-border text-muted rounded-xl border border-dashed px-6 py-16 text-center">
          <p>아직 상품이 없습니다.</p>
          <p className="mt-1 text-sm">
            &quot;상품 추가&quot;를 눌러 첫 촬영 상품을 만들어보세요.
          </p>
        </div>
      ) : null}

      <ProductGrid products={products ?? []} />
    </div>
  );
}
