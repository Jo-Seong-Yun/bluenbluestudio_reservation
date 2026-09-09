import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductEditorPanel } from "./product-editor-panel";
import { CustomFieldsSection } from "./custom-fields-section";

export const metadata: Metadata = { title: "상품 수정" };

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  // 로그인 확인은 app/admin/(dashboard)/layout.tsx 가 이미 한다.

  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: customFields }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("custom_fields")
      .select(
        "id, product_id, label, type, options, description, required, active, sort_order, created_at",
      )
      .eq("product_id", id)
      .order("sort_order"),
  ]);

  if (!product) notFound();

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-muted mb-2 inline-block text-sm hover:underline"
      >
        ← 상품관리
      </Link>

      <ProductEditorPanel
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          durationMin: product.duration_min,
          bufferAfterMin: product.buffer_after_min,
          price: product.price,
          maxPeople: product.max_people,
          summary: product.summary ?? "",
          description: product.description ?? "",
          coverImage: product.cover_image,
          gallery: product.gallery ?? [],
          isPublished: product.is_published,
          tagColor: product.tag_color,
        }}
        description={product.description ?? ""}
      >
        <CustomFieldsSection
          productId={product.id}
          fields={customFields ?? []}
        />
      </ProductEditorPanel>
    </div>
  );
}
