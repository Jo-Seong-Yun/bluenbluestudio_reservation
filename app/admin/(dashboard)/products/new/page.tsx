import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "상품 추가" };

export default async function NewProductPage() {
  await requireAdmin();

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
