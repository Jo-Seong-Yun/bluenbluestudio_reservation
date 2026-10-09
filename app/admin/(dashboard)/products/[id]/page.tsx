import { depositEnabled } from "@/lib/booking/deposit";
import { BookingCopyEditor } from "./booking-copy-editor";
import { productCopy } from "@/lib/booking/copy";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductEditorPanel } from "./product-editor-panel";
import { CustomFieldsSection } from "./custom-fields-section";
import { Button } from "@/components/ui";

export const metadata: Metadata = { title: "상품 수정" };

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  // 로그인 확인은 app/admin/(dashboard)/layout.tsx 가 이미 한다.

  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: customFields }, { data: allProducts }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("custom_fields")
        .select(
          "id, product_id, label, type, options, option_prices, option_descriptions, description, required, active, sort_order, created_at",
        )
        .eq("product_id", id)
        .order("sort_order"),
      supabase
        .from("products")
        .select("id, name")
        .neq("id", id)
        .order("sort_order"),
    ]);

  if (!product) notFound();
  const { data: copySettings } = await supabase
    .from("settings")
    .select("booking_style")
    .eq("id", 1)
    .single();

  return (
    <div>
      <Link href="/admin/products" className="mb-2 inline-block">
        <Button type="button" variant="ghost">
          ← 상품관리
        </Button>
      </Link>

      <ProductEditorPanel
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          durationMin: product.duration_min,
          bufferAfterMin: product.buffer_after_min,
          price: product.price,
          salePrice: product.sale_price,
          maxPeople: product.max_people,
          summary: product.summary ?? "",
          description: product.description ?? "",
          deliveryNote: product.delivery_note ?? "",
          coverImage: product.cover_image,
          isPublished: product.is_published,
          tagColor: product.tag_color,
        }}
        description={product.description ?? ""}
      >
        <CustomFieldsSection
          productId={product.id}
          fields={customFields ?? []}
          otherProducts={allProducts ?? []}
        />
      </ProductEditorPanel>
      <BookingCopyEditor
        depositRequired={depositEnabled(copySettings?.booking_style)}
        fields={customFields ?? []}
        product={product}
        initial={productCopy(copySettings?.booking_style, product.id)}
      />
    </div>
  );
}
