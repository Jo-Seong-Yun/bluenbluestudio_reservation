import type { Metadata } from "next";
import Link from "next/link";
import { NewProductForm } from "./new-product-form";

export const metadata: Metadata = { title: "상품 추가" };

export default async function NewProductPage() {
  // 로그인 확인은 app/admin/(dashboard)/layout.tsx 가 이미 한다.
  // 여기서 또 하면 Supabase 인증 서버를 왕복 호출을 한 번 더 하게 되어
  // 화면마다 그만큼 느려진다.

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-muted mb-2 inline-block text-sm hover:underline"
      >
        ← 상품관리
      </Link>

      <NewProductForm
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
