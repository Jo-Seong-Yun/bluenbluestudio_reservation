import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/images";
import { SITE } from "@/lib/site";
import { tagColorDotClass } from "@/lib/product-tag-colors";

export const metadata: Metadata = { title: "예약하기" };

export default async function BookingPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, summary, price, cover_image, tag_color")
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("settings")
      .select("show_product_thumbnails")
      .eq("id", 1)
      .single(),
  ]);
  const showThumbnails = settings?.show_product_thumbnails ?? true;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-accent text-sm font-medium tracking-widest uppercase">
        {SITE.nameEn}
      </p>
      <h1 className="mt-2 text-3xl font-bold">촬영 상품 선택</h1>
      <p className="text-muted mt-2">원하시는 촬영을 골라 주시기 바랍니다.</p>

      {!products || products.length === 0 ? (
        <p className="text-muted mt-12 text-center">
          현재 예약 가능한 상품이 없습니다. 곧 준비하겠습니다.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {products.map((product) => {
            // 관리자 화면에서 상품마다 고른 태그 색을(상품관리·스케줄
            // 캘린더와 같은 팔레트) 여기서도 그대로 써서, 손님이 색만
            // 보고도 어떤 상품들끼리 같은 계열인지 자연스럽게 구분되게
            // 한다. 카드 전체를 물들이면 산만해 보여서, 왼쪽 끝에 얇은
            // 색 띠만 붙인다(라벨 태그 같은 느낌) — 색이 없는 상품은
            // 띠 없이 그냥 기본 카드로 보인다.
            const dotClass = tagColorDotClass(product.tag_color);
            return (
              <li key={product.id}>
                {/* 예전엔 행 전체가 링크라는 게 잘 안 드러나서 "누르면
                    되는 건가?" 싶었다는 피드백을 반영해, 오른쪽에
                    가격과 "예약하기 →" 문구를 명확한 행동 유도 요소로
                    따로 둔다(hover 시 화살표가 살짝 밀리며 반응).
                    카드 자체도 hover 시 살짝 떠오르며 그림자가 생겨
                    눌러볼 수 있는 요소라는 걸 몸으로 느끼게 한다. */}
                <Link
                  href={`/booking/${product.slug}`}
                  className="border-border bg-surface hover:border-brand group flex items-stretch overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {dotClass ? (
                    <span className={`w-1.5 shrink-0 ${dotClass}`} />
                  ) : null}
                  <div className="flex min-w-0 flex-1 items-center gap-4 p-4">
                    {showThumbnails ? (
                      product.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={publicImageUrl(product.cover_image)}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="bg-surface-subtle h-20 w-20 shrink-0 rounded-lg" />
                      )
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold">{product.name}</h2>
                      {product.summary ? (
                        <p className="text-muted mt-0.5 line-clamp-2 text-sm">
                          {product.summary}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2 text-right">
                      <p className="text-lg font-bold whitespace-nowrap">
                        {product.price.toLocaleString()}원
                      </p>
                      <span className="text-brand group-hover:gap-1.5 inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-[gap]">
                        예약하기
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/booking/lookup"
          className="text-muted text-sm hover:underline"
        >
          이미 예약하셨습니까? 예약 조회 →
        </Link>
      </div>
    </main>
  );
}
