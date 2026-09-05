import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DescriptionEditor } from "./description-editor";

export const metadata: Metadata = { title: "상세 설명 편집" };

export default async function ProductDescriptionPage({
  params,
}: PageProps<"/admin/products/[id]/description">) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  return (
    <div>
      <Link
        href={`/admin/products/${id}`}
        className="text-muted text-sm hover:underline"
      >
        ← {product.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">상세 설명 편집</h1>

      <DescriptionEditor
        productId={product.id}
        initial={product.description ?? ""}
      />
    </div>
  );
}
