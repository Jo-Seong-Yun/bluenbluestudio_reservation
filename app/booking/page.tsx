import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/images";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "예약하기" };

export default async function BookingPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, summary, price, duration_min, cover_image")
    .eq("is_published", true)
    .order("sort_order")
    .order("created_at");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-accent text-sm font-medium tracking-widest uppercase">
        {SITE.nameEn}
      </p>
      <h1 className="mt-2 text-3xl font-bold">촬영 상품 선택</h1>
      <p className="text-muted mt-2">원하시는 촬영을 골라주세요.</p>

      {!products || products.length === 0 ? (
        <p className="text-muted mt-12 text-center">
          현재 예약 가능한 상품이 없어요. 곧 준비하겠습니다.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/booking/${product.slug}`}
                className="border-border bg-surface hover:border-brand flex items-center gap-4 rounded-xl border p-4 transition-colors"
              >
                {product.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicImageUrl(product.cover_image)}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="bg-surface-subtle h-20 w-20 shrink-0 rounded-lg" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{product.name}</h2>
                  {product.summary ? (
                    <p className="text-muted mt-0.5 line-clamp-2 text-sm">
                      {product.summary}
                    </p>
                  ) : null}
                  <p className="text-muted mt-1 text-sm">
                    {product.duration_min}분 · {product.price.toLocaleString()}
                    원
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/booking/lookup"
          className="text-muted text-sm hover:underline"
        >
          이미 예약하셨나요? 예약 조회 →
        </Link>
      </div>
    </main>
  );
}
