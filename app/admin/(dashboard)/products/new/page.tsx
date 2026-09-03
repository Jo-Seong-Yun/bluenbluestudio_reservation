import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "상품 추가" };

export default async function NewProductPage() {
  // 로그인 확인은 app/admin/(dashboard)/layout.tsx 가 이미 한다.
  // 여기서 또 하면 Supabase 인증 서버를 왕복 호출을 한 번 더 하게 되어
  // 화면마다 그만큼 느려진다.

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-muted text-sm hover:underline"
      >
        ← 상품 관리
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">상품 추가</h1>

      <ProductForm
        initial={{
          name: "",
          slug: "",
          durationMin: 60,
          bufferAfterMin: 0,
          price: 0,
          maxPeople: null,
          summary: "",
          description: "",
          coverImage: null,
          gallery: [],
          isPublished: false,
        }}
      />
    </div>
  );
}
