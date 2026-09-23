import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/images";
import { SITE, BRAND_LOGO } from "@/lib/site";
import { tagColorDotClass } from "@/lib/product-tag-colors";
import { resolveBookingTheme, type BookingSocialLink } from "@/lib/booking-theme";
import { BookingListViewTracker } from "./booking-list-view-tracker";

export const metadata: Metadata = { title: "예약하기" };

export default async function BookingPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, summary, price, sale_price, cover_image, tag_color")
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("settings")
      .select("show_product_thumbnails, booking_theme, booking_social_links")
      .eq("id", 1)
      .single(),
  ]);
  const showThumbnails = settings?.show_product_thumbnails ?? true;
  const theme = resolveBookingTheme(settings?.booking_theme);
  const socialLinks = (settings?.booking_social_links ??
    []) as BookingSocialLink[];

  return (
    <div className={`min-h-dvh ${theme.pageBg}`}>
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <BookingListViewTracker />

        {/* 프로필 헤더 — 로고를 아바타처럼, 그 아래 소개문구와 소셜
            링크. 린크트리의 "누구인지 먼저 알려주고, 그다음 링크 목록"
            구조를 그대로 가져왔다. */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border shadow-sm ${theme.avatarBg} ${theme.avatarBorder}`}
          >
            <Image
              src={BRAND_LOGO.src}
              alt={SITE.name}
              width={BRAND_LOGO.width}
              height={BRAND_LOGO.height}
              priority
              className="h-9 w-auto"
            />
          </div>
          <h1 className={`mt-4 text-xl font-bold ${theme.heading}`}>
            {SITE.name}
          </h1>
          <p className={`mt-1.5 max-w-sm text-sm ${theme.muted}`}>
            {SITE.description}
          </p>

          {socialLinks.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-70 ${theme.cardBg} ${theme.cardBorder} ${theme.heading}`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <p className={`mt-10 mb-3 text-center text-sm ${theme.muted}`}>
          원하시는 촬영을 골라 주시기 바랍니다.
        </p>

        {!products || products.length === 0 ? (
          <p className={`mt-12 text-center ${theme.muted}`}>
            현재 예약 가능한 상품이 없습니다. 곧 준비하겠습니다.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {products.map((product) => {
              // 관리자 화면에서 상품마다 고른 태그 색을(상품관리·스케줄
              // 캘린더와 같은 팔레트) 여기서도 그대로 써서, 손님이 색만
              // 보고도 어떤 상품들끼리 같은 계열인지 자연스럽게
              // 구분되게 한다. 카드 전체를 물들이면 산만해 보여서,
              // 왼쪽 끝에 얇은 색 띠만 붙인다(라벨 태그 같은 느낌) —
              // 색이 없는 상품은 띠 없이 그냥 기본 카드로 보인다.
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
                    className={`group flex items-stretch overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.cardBg} ${theme.cardBorder} ${theme.cardRadius}`}
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
                        <h2 className={`text-lg font-bold sm:text-xl ${theme.heading}`}>
                          {product.name}
                        </h2>
                        {/* 작은 설명 텍스트만 박스 왼쪽 기준 60% 지점에서
                            줄바꿈되게 너비를 묶는다 — 제목은 그대로 두고
                            싶다는 요청. */}
                        {product.summary ? (
                          <p className={`mt-0.5 line-clamp-2 max-w-[60%] text-xs sm:text-sm ${theme.muted}`}>
                            {product.summary}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2 text-right">
                        {/* 할인가가 있는 카드와 없는 카드의 블럭 높이가
                            서로 달라 목록이 들쭉날쭉해 보였다 — 할인
                            유무와 무관하게 항상 "취소선+배지 줄 / 가격
                            줄" 두 줄 구조를 그대로 두고, 할인가가 없을
                            때는 위 줄을 invisible로만 숨겨 자리(높이)는
                            그대로 차지하게 한다. 그래서 모든 카드가 할인
                            카드 기준 높이로 고정된다. */}
                        <div className="flex flex-col items-end gap-0">
                          <div
                            className={`flex items-center gap-1.5 ${
                              product.sale_price == null ? "invisible" : ""
                            }`}
                            aria-hidden={product.sale_price == null}
                          >
                            <span className={`text-xs line-through ${theme.mutedFaint}`}>
                              {product.price.toLocaleString()}원
                            </span>
                            <span className={`rounded-md px-1 py-0.5 text-xs font-bold ${theme.badgeBg} ${theme.badgeText}`}>
                              {product.sale_price != null
                                ? Math.round(
                                    (1 - product.sale_price / product.price) *
                                      100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                          <p className={`text-lg font-extrabold whitespace-nowrap sm:text-xl ${theme.heading}`}>
                            {(product.sale_price ?? product.price).toLocaleString()}원
                          </p>
                        </div>
                        <span
                          className={`group-hover:gap-1.5 inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap transition-[gap] sm:text-sm ${theme.ctaText}`}
                        >
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
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${theme.cardRadius} ${theme.ctaButtonBg} ${theme.ctaButtonText}`}
          >
            이미 예약하셨습니까? 예약 조회 →
          </Link>
        </div>
      </main>
    </div>
  );
}
