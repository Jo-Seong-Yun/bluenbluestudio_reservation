import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "상품 수정" };

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-muted text-sm hover:underline"
      >
        ← 상품 관리
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">{product.name}</h1>

      <ProductForm
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
        }}
      />
    </div>
  );
}
